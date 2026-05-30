// Cubic Bézier easing solver: returns f(x) where f is the curve parameterised
// by control points (0,0) → (x1,y1) → (x2,y2) → (1,1). Uses Newton-Raphson on
// the x axis to recover t, then evaluates y(t). Handles overshoot (y > 1).
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  // Coefficients for B(t) = a*t^3 + b*t^2 + c*t, using control points
  // P0=(0,0), P3=(1,1) so the linear and constant terms collapse.
  const ax = 1 - 3 * x2 + 3 * x1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1
  const ay = 1 - 3 * y2 + 3 * y1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const derivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  function tForX(x: number): number {
    let t = x
    for (let i = 0; i < 8; i++) {
      const xt = sampleX(t) - x
      if (Math.abs(xt) < 1e-6) return t
      const slope = derivativeX(t)
      if (Math.abs(slope) < 1e-6) break
      t -= xt / slope
    }
    // Bisection fallback if Newton fails.
    let lo = 0, hi = 1
    t = x
    for (let i = 0; i < 24; i++) {
      const xt = sampleX(t)
      if (Math.abs(xt - x) < 1e-6) return t
      if (xt < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return t
  }

  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    return sampleY(tForX(x))
  }
}
