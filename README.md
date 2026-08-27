# Complex zeros

Interactive visualizations and expository notes on polynomial and rational Newton flows.

- **Polynomial / Sendov page:** https://liuyao12.github.io/complex-zeros/
- **Rational-function page:** https://liuyao12.github.io/complex-zeros/rational.html
- **Electrostatic field-line essay:** https://liuyao12.github.io/complex-zeros/electrostatic-field-lines.html
- **Markdown source for the essay:** [docs/electrostatic-field-lines.md](docs/electrostatic-field-lines.md)

## Expository article

The essay develops the common geometry behind finite signed point configurations, constant-argument pencils of real algebraic curves, continuous Newton flow, singular members at critical points, and the Newton graph. A sticky, draggable interactive follows the exposition from the two-point circle and rectangular-hyperbola pencils to singular cubic members for three-point configurations.

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
