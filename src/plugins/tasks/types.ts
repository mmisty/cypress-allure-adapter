// should be no functions
export type TaskType<S extends string | number | Record<string, unknown>> = <R>(arg: S) => null | R | Promise<R>;
