import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** Calls a Supabase Edge Function and surfaces the REAL error message to the caller.
 *
 * supabase-js's `functions.invoke()` treats any non-2xx response as a generic
 * `FunctionsHttpError` ("Edge Function returned a non-2xx status code") and does NOT
 * automatically parse the JSON body our functions return (`{ error: '...' }`) — that body is
 * only reachable via `error.context`, a raw `Response` object. Every Edge Function in this app
 * follows the same `json({ error: '...' }, status)` convention, so this one helper unwraps it
 * everywhere instead of every call site having to know about `error.context`. */
export async function invokeEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error) {
    let message = error.message
    if (error instanceof FunctionsHttpError) {
      try {
        const parsed = await error.context.json()
        if (parsed?.error) message = parsed.error
      } catch {
        // response body wasn't JSON — fall back to the generic message
      }
    }
    throw new Error(message)
  }

  if (data?.error) throw new Error(data.error)
  return data as T
}
