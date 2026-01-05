const { getSupabaseClient, mapSupabaseError } = require('../services/supabase');

function parseIfMatchVersion(ifMatchHeader) {
  if (!ifMatchHeader) return null;

  // Accept: W/"3", "3", 3
  const raw = String(ifMatchHeader).trim();
  const cleaned = raw.replace(/^W\//i, '').replace(/^"/, '').replace(/"$/, '');
  const asInt = Number(cleaned);
  if (!Number.isInteger(asInt) || asInt < 1) return null;
  return asInt;
}

function toTaskResponse(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    updated_at: row.updated_at,
    version: row.version,
  };
}

class TasksController {
  /**
   * PUBLIC_INTERFACE
   * List tasks for the authenticated user.
   */
  async list(req, res, next) {
    try {
      const supabase = getSupabaseClient();
      const userId = req.auth.userId;

      const { data, error } = await supabase
        .from('tasks')
        .select('id,user_id,title,description,status,priority,updated_at,version')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        const mapped = mapSupabaseError(error);
        return res.status(mapped?.status || 400).json({
          status: 'error',
          message: mapped?.message || 'Failed to list tasks',
        });
      }

      return res.status(200).json({
        status: 'ok',
        tasks: (data || []).map(toTaskResponse),
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Create a new task.
   */
  async create(req, res, next) {
    try {
      const supabase = getSupabaseClient();
      const userId = req.auth.userId;
      const { title, description, status, priority } = req.validatedBody;

      const insertPayload = {
        user_id: userId,
        title,
        description: description ?? null,
        status: status || 'todo',
        priority: priority ?? null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(insertPayload)
        .select('id,user_id,title,description,status,priority,updated_at,version')
        .limit(1);

      if (error) {
        const mapped = mapSupabaseError(error);
        return res.status(mapped?.status || 400).json({
          status: 'error',
          message: mapped?.message || 'Failed to create task',
        });
      }

      const task = data && data[0];
      return res.status(201).json({ status: 'ok', task: toTaskResponse(task) });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Get a single task.
   */
  async get(req, res, next) {
    try {
      const supabase = getSupabaseClient();
      const userId = req.auth.userId;
      const taskId = req.params.id;

      const { data, error } = await supabase
        .from('tasks')
        .select('id,user_id,title,description,status,priority,updated_at,version')
        .eq('id', taskId)
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        const mapped = mapSupabaseError(error);
        return res.status(mapped?.status || 400).json({
          status: 'error',
          message: mapped?.message || 'Failed to fetch task',
        });
      }

      const task = data && data[0];
      if (!task) {
        return res.status(404).json({ status: 'error', message: 'Task not found' });
      }

      // Provide ETag as version to support If-Match.
      res.set('ETag', `"${task.version}"`);
      return res.status(200).json({ status: 'ok', task: toTaskResponse(task) });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Update a task (partial updates supported).
   *
   * Optimistic concurrency:
   * - If client provides If-Match header, we use it as expected current version.
   * - Else if payload provides version, we use it.
   * - If neither is provided, update is allowed but may fail if DB trigger requires version.
   *
   * NOTE: Schema trigger requires NEW.version == OLD.version, so the backend must
   * include `version` in the update payload. If absent, we fetch current version first.
   */
  async update(req, res, next) {
    try {
      const supabase = getSupabaseClient();
      const userId = req.auth.userId;
      const taskId = req.params.id;

      const ifMatchVersion = parseIfMatchVersion(req.get('If-Match'));
      const body = req.validatedBody || {};
      const providedVersion = Number.isInteger(body.version) ? body.version : null;

      // Build update patch (never allow user_id changes).
      const patch = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.description !== undefined) patch.description = body.description ?? null;
      if (body.status !== undefined) patch.status = body.status;
      if (body.priority !== undefined) patch.priority = body.priority ?? null;

      // Edge case: empty patch.
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ status: 'error', message: 'No fields provided to update' });
      }

      // Determine expected version: header takes precedence.
      let expectedVersion = ifMatchVersion ?? providedVersion;

      // If no expected version given, fetch current version first to satisfy trigger.
      if (!expectedVersion) {
        const { data: existing, error: fetchError } = await supabase
          .from('tasks')
          .select('id,version')
          .eq('id', taskId)
          .eq('user_id', userId)
          .limit(1);

        if (fetchError) {
          const mapped = mapSupabaseError(fetchError);
          return res.status(mapped?.status || 400).json({
            status: 'error',
            message: mapped?.message || 'Failed to update task',
          });
        }
        const row = existing && existing[0];
        if (!row) {
          return res.status(404).json({ status: 'error', message: 'Task not found' });
        }
        expectedVersion = row.version;
      }

      // Trigger expects NEW.version to equal OLD.version; it will increment it.
      patch.version = expectedVersion;

      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select('id,user_id,title,description,status,priority,updated_at,version')
        .limit(1);

      if (error) {
        const mapped = mapSupabaseError(error);

        // Trigger exception text comes back as message; map version conflicts to 409.
        const msg = (mapped?.message || '').toLowerCase();
        const isConflict = msg.includes('version conflict');

        return res.status(isConflict ? 409 : (mapped?.status || 400)).json({
          status: 'error',
          message: isConflict ? 'Version conflict' : (mapped?.message || 'Failed to update task'),
        });
      }

      const updated = data && data[0];
      if (!updated) {
        // Could happen if eq filters don't match.
        return res.status(404).json({ status: 'error', message: 'Task not found' });
      }

      res.set('ETag', `"${updated.version}"`);
      return res.status(200).json({ status: 'ok', task: toTaskResponse(updated) });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Delete a task.
   *
   * Optimistic concurrency:
   * - Requires If-Match header OR ?version= query param.
   * - If missing, returns 428 Precondition Required.
   *
   * NOTE: Schema trigger for DELETE requires session GUC app.expected_task_version.
   * Supabase JS cannot set per-request GUC easily; instead we implement safe delete by:
   * 1) Fetch task to ensure owner + current version.
   * 2) If expected version mismatch => 409.
   * 3) Delete by id/user_id.
   *
   * This keeps semantics consistent even if DB trigger enforces extra checks.
   */
  async remove(req, res, next) {
    try {
      const supabase = getSupabaseClient();
      const userId = req.auth.userId;
      const taskId = req.params.id;

      const ifMatchVersion = parseIfMatchVersion(req.get('If-Match'));
      const queryVersion = req.query && req.query.version ? Number(req.query.version) : null;
      const expectedVersion =
        ifMatchVersion ?? (Number.isInteger(queryVersion) && queryVersion >= 1 ? queryVersion : null);

      if (!expectedVersion) {
        return res.status(428).json({
          status: 'error',
          message: 'Missing If-Match header (expected task version) for delete',
        });
      }

      const { data: existing, error: fetchError } = await supabase
        .from('tasks')
        .select('id,version')
        .eq('id', taskId)
        .eq('user_id', userId)
        .limit(1);

      if (fetchError) {
        const mapped = mapSupabaseError(fetchError);
        return res.status(mapped?.status || 400).json({
          status: 'error',
          message: mapped?.message || 'Failed to delete task',
        });
      }

      const row = existing && existing[0];
      if (!row) {
        return res.status(404).json({ status: 'error', message: 'Task not found' });
      }

      if (row.version !== expectedVersion) {
        return res.status(409).json({ status: 'error', message: 'Version conflict' });
      }

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (deleteError) {
        const mapped = mapSupabaseError(deleteError);
        const msg = (mapped?.message || '').toLowerCase();
        const isConflict = msg.includes('version conflict') || msg.includes('missing expected version');

        return res.status(isConflict ? 409 : (mapped?.status || 400)).json({
          status: 'error',
          message: isConflict ? 'Version conflict' : (mapped?.message || 'Failed to delete task'),
        });
      }

      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TasksController();
