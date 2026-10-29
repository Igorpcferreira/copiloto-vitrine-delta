const REACT_TRACK_PREFIX = "​";

if (process.env.NODE_ENV === "development") {
  const measure = performance.measure.bind(performance);
  performance.measure = ((name: string, options?: string | PerformanceMeasureOptions, endMark?: string) => {
    if (name.startsWith(REACT_TRACK_PREFIX) && typeof options === "object" && typeof options.end === "number" && options.end < 0) {
      return measure(name, { ...options, end: 0 });
    }
    return measure(name, options, endMark);
  }) as typeof performance.measure;
}
