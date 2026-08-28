# Complex zeros

Interactive visualizations and expository notes on polynomial and rational Newton flows.

- **Polynomial / Sendov page:** https://liuyao12.github.io/complex-zeros/
- **Rational-function page:** https://liuyao12.github.io/complex-zeros/rational.html
- **Planar electrostatic field-line essay:** https://liuyao12.github.io/complex-zeros/electrostatic-field-lines.html
- **Markdown source for the essay:** [docs/electrostatic-field-lines.md](docs/electrostatic-field-lines.md)

## Expository article

The essay begins with the two-point circle and rectangular-hyperbola pencils, then the singular cubic for three points, before deriving the general rational-function picture. A sticky, draggable interactive sits beside the Markdown-rendered text; tabs switch among the four examples, and anchored sections select the matching configuration automatically as the reader scrolls.

It develops the common geometry behind finite signed planar point configurations, constant-argument pencils of real algebraic curves, continuous Newton flow, singular members at critical points, and the Newton graph.

## Polynomial page

Shows the zeros of a polynomial, the zeros of its derivative, the Newtonian graph, critical lemniscates, the smallest enclosing disk, and normalized Newton-path lengths related to Sendov's theorem.

## Rational page

For

```text
f(z) = ∏(z-a_i) / ∏(z-b_j),
```

shows zeros, poles, critical points, the zero-side Newton graph, its pole-side dual graph, and all critical lemniscates `|f(z)| = |f(w)|`.

The rational editor supports:

- dragging finite zeros and poles;
- live placement of a new zero or pole before committing it;
- the exact family `f ↦ f + c`, which moves zeros while fixing all poles and all critical points;
- Möbius chart changes that send a chosen zero or pole to infinity;
- unequal finite zero/pole counts, with the missing divisor and any ramification displayed at infinity;
- a rotatable Riemann-sphere view of the points and Newton separatrices.

A single critical point is deliberately not treated as an independent draggable parameter: with the poles and the remaining critical points fixed, the zero-residue constraints on `f′` are generically incompatible with moving only that critical point.

Solid white separatrices run from saddles to zeros; equally thick dashed separatrices run from poles to saddles. The tracer uses the reciprocal coordinate `u = 1/z` for edges crossing or ending at infinity.

On both visualization pages, empty canvas space can be panned and the mouse wheel zooms.
