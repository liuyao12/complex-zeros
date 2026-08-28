# Planar electrostatic field lines, algebraic pencils, and Newton graphs

The simplest signed point configurations in the plane already draw familiar algebraic curves. Here a charge \(q\) at \(a\) produces the planar logarithmic field

$$
q\frac{(x,y)-a}{|(x,y)-a|^2},
$$

whose magnitude is \(|q|/r\), rather than the \(1/r^2\) law of three-dimensional electrostatics. Equivalently, its potential is \(q\log r\).

With two opposite unit charges, the field lines are circles. With two like unit charges, they are rectangular hyperbolas. Increasing one charge from \(+1\) to \(+2\) already raises the containing algebraic curves from conics to cubics. Three unit charges give two further kinds of cubic pencil. We will examine these cases first, and only afterward introduce the complex-variable calculation that explains all of them at once.

The floating diagram follows the examples as you read. Blue circles are positive charges, rose circles are negative charges, and an integer inside a circle records its charge. Drag the charges. The circular \(\mathbb{RP}^1\) dial selects a member of the pencil; the fixed orange radii mark singular members. Clicking the rim or an orange radius moves smoothly to that parameter and pauses the animation.

Begin with [opposite charges](#two-points-with-opposite-signs-a-pencil-of-circles), then [like charges](#two-points-with-like-signs-a-pencil-of-rectangular-hyperbolas), the [weighted two-point cubic](#two-weighted-charges-a-cubic-pencil-from-2-and-1), [three positive charges](#three-positive-charges-an-irreducible-cubic-pencil), and [two positive with one negative](#three-signed-points-two-positive-and-one-negative-charge).

## Two points with opposite signs: a pencil of circles

Place a positive unit charge at \((-1,0)\) and a negative unit charge at \((1,0)\). Put

$$
\rho_-^2=(x+1)^2+y^2,
\qquad
\rho_+^2=(x-1)^2+y^2.
$$

The planar \(1/r\) force field is

$$
\mathbf E(x,y)
=
\frac{(x+1,y)}{\rho_-^2}
-
\frac{(x-1,y)}{\rho_+^2}
=
\frac{2}{\rho_-^2\rho_+^2}
\bigl(1-x^2+y^2,-2xy\bigr).
$$

Now consider the one-parameter family

$$
x^2+y^2-1+2cy=0,
\qquad c\in\mathbb R.
$$

Each member is the circle

$$
x^2+(y+c)^2=1+c^2,
$$

so it passes through both charges. A tangent vector to this circle is

$$
(y+c,-x).
$$

On the circle equation,

$$
1-x^2+y^2=2y(y+c),
$$

and consequently

$$
\bigl(1-x^2+y^2,-2xy\bigr)
=2y\,(y+c,-x).
$$

Thus the force is tangent to the circle at every regular point. These circles, together with the limiting straight line \(y=0\), are exactly the field lines. The two charged points are the common base points of a coaxal pencil of circles.

The interactive emphasizes one physical arc from the positive charge to the negative charge, while drawing the rest of the algebraic circle more lightly.

## Two points with like signs: a pencil of rectangular hyperbolas

Now place positive unit charges at both \((-1,0)\) and \((1,0)\). The field is

$$
\mathbf E(x,y)
=
\frac{(x+1,y)}{\rho_-^2}
+
\frac{(x-1,y)}{\rho_+^2}
=
\frac{2}{\rho_-^2\rho_+^2}
\bigl(x(x^2+y^2-1),\,y(x^2+y^2+1)\bigr).
$$

Consider the pencil of conics

$$
2xy=\lambda(x^2-y^2-1),
\qquad \lambda\in\mathbb R\cup\{\infty\}.
$$

Every member passes through \((-1,0)\) and \((1,0)\). The quadratic part has zero trace, so each nondegenerate member is a rectangular hyperbola. A tangent vector to

$$
2xy-\lambda(x^2-y^2-1)=0
$$

is

$$
(x+\lambda y,\,\lambda x-y).
$$

Using

$$
\lambda=\frac{2xy}{x^2-y^2-1}
$$

on the curve, this tangent vector becomes proportional to

$$
\bigl(x(x^2+y^2-1),\,y(x^2+y^2+1)\bigr),
$$

which is the direction of the force. Hence the field lines are precisely this pencil of rectangular hyperbolas.

At the origin the two forces cancel. The member \(\lambda=0\) degenerates to

$$
xy=0,
$$

the two coordinate axes crossing at the equilibrium point. Thus, even before complex notation enters, an equilibrium already appears as the node of a singular member of the field-line pencil.

Here a physical field line occupies one branch of a hyperbola: it runs between a charge and infinity, not from one positive charge to the other. The unused branch is retained only as a lighter algebraic continuation.

## Two weighted charges: a cubic pencil from +2 and -1

Keep the charges at \((-1,0)\) and \((1,0)\), but give them strengths \(+2\) and \(-1\). The field is

$$
\mathbf E(x,y)
=
2\frac{(x+1,y)}{\rho_-^2}
-
\frac{(x-1,y)}{\rho_+^2}.
$$

A direct calculation, of the same kind as in the two conic examples, shows that the field is tangent to the cubic pencil

$$
V(x,y)=\lambda U(x,y),
\qquad \lambda\in\mathbb R\cup\{\infty\},
$$

where

$$
U=x^3+x^2-x-1+(x+3)y^2,
$$

and

$$
V=y(x^2-2x+y^2-3).
$$

Thus changing only the multiplicity of a charge raises the algebraic degree from \(2\) to \(3\), even though there are still only two distinct charged locations.

The unique equilibrium away from the charges is

$$
(3,0).
$$

It lies on the singular member \(\lambda=0\), which factors transparently:

$$
V=0
\quad\Longleftrightarrow\quad
 y\bigl((x-1)^2+y^2-4\bigr)=0.
$$

So this singular cubic is the union of the real axis and the circle of radius \(2\) centered at \((1,0)\). They cross at the equilibrium \((3,0)\); they also meet at the doubled positive base point \((-1,0)\). This is the simplest cubic illustration of the principle that an equilibrium is detected by a singular member of the field-line pencil.

## Three positive charges: an irreducible cubic pencil

Now place three positive unit charges at

$$
(-1,0),\qquad (1,0),\qquad (0,1).
$$

Direct elimination produces another cubic pencil

$$
V(x,y)=\lambda U(x,y),
$$

with

$$
U=x^3-3xy^2+2xy-x,
$$

and

$$
V=3x^2y-x^2-y^3+y^2-y+1.
$$

All members pass through the three charged points. The two equilibria are

$$
w_\pm=
\left(\pm\frac{\sqrt2}{3},\frac13\right).
$$

There are correspondingly two distinguished parameters on the circular dial. At either one, the selected cubic develops an ordinary node at the associated equilibrium. Unlike the weighted two-point example, a generic singular member here is an irreducible nodal cubic rather than an obvious line-circle union.

A nodal cubic is rational: projection from its node gives a rational parametrization. This makes the three-charge case unusually explicit, although in higher degree a single node is generally not enough to make the curve rational.

## Three signed points: two positive and one negative charge

Finally, put positive unit charges at \((-1,0)\) and \((1,0)\), and a negative unit charge at \((0,1)\). Direct elimination again gives a cubic pencil

$$
V(x,y)=\lambda U(x,y),
$$

where

$$
U=x(x^2+y^2-2y-1),
$$

and

$$
V=(1+y)x^2+y^3-y^2+y-1.
$$

The equilibria are

$$
w_\pm=
\bigl(0,1\pm\sqrt2\bigr).
$$

At either critical parameter the cubic has a four-pronged node. The branches now alternate dynamically: two directions lead toward positive charges and two lead backward toward the negative charge. The algebraic appearance is still a nodal cubic, but the signs change the global way its branches connect the distinguished points.

We have now seen three cubic mechanisms:

- a repeated positive charge against a negative charge;
- three positive unit charges;
- two positive and one negative unit charge.

The formulas look unrelated if expanded in \(x\) and \(y\). The complex plane reveals that they are all instances of one construction.

## The complex-variable explanation

Identify the plane with \(\mathbb C\). A signed integer charge \(q_j\) at \(a_j\in\mathbb C\) contributes the complex vector

$$
q_j\frac{z-a_j}{|z-a_j|^2}
=
\overline{\frac{q_j}{z-a_j}}.
$$

Encode the configuration by

$$
f(z)=\prod_j(z-a_j)^{q_j}.
$$

Negative charges give negative exponents, so in general \(f=P/Q\) is rational. Its logarithmic derivative satisfies

$$
\frac{f'(z)}{f(z)}
=
\sum_j\frac{q_j}{z-a_j},
$$

and therefore the planar force field is

$$
\boxed{
\mathcal E(z)=\overline{\frac{f'(z)}{f(z)}}.
}
$$

If \(z(s)\) follows the force field, so that \(z'(s)=\mathcal E(z(s))\), then

$$
\frac{d}{ds}\log f(z(s))
=
\frac{f'(z(s))}{f(z(s))}z'(s)
=
\left|\frac{f'(z(s))}{f(z(s))}\right|^2,
$$

which is real. Hence

$$
\frac{d}{ds}\arg f(z(s))=0.
$$

The field lines are therefore the connected components of

$$
\arg f(z)=\theta.
$$

Writing \(f=P/Q\), we may clear the denominator without changing this condition:

$$
\arg\bigl(P(z)\overline{Q(z)}\bigr)=\theta\pmod\pi.
$$

This is exactly the real algebraic pencil seen in the examples.

For the weighted pair,

$$
f(z)=\frac{(z+1)^2}{z-1};
$$

for three positive charges,

$$
f(z)=(z+1)(z-1)(z-i);
$$

and for the mixed three-point configuration,

$$
f(z)=\frac{z^2-1}{z-i}.
$$

Expanding \(P(z)\overline{Q(z)}=U(x,y)+iV(x,y)\) gives precisely the three cubic pairs \(U,V\) above.

## Theorem: the planar field-line pencil

Let positive integer charges be placed at the zeros of a polynomial \(P\), and negative integer charges at the zeros of a polynomial \(Q\), with \(P\) and \(Q\) coprime. Put

$$
f(z)=\frac{P(z)}{Q(z)}.
$$

For each \(	heta\in\mathbb R/\pi\mathbb Z\), define

$$
\boxed{
\mathcal C_\theta:
\quad
\operatorname{Im}\!\left(
 e^{-i\theta}P(z)\overline{Q(z)}
\right)=0.
}
$$

Then:

1. Away from the charges, the connected components of the curves \(\mathcal C_\theta\) are exactly the planar \(1/r\) field lines.
2. Each \(\mathcal C_\theta\) is a real algebraic curve of degree at most \(\deg P+\deg Q\), and every charge is a base point of the pencil, with its multiplicity recorded algebraically.
3. A point \(w\) away from the charges is an equilibrium if and only if \(f'(w)=0\). In that case the unique member through \(w\), namely \(	heta=\arg f(w)\pmod\pi\), is singular at \(w\).
4. If \(w\) is a simple critical point of \(f\), the singularity is an ordinary real node with four local branches.

The circle and hyperbola pencils are the degree-two instances. All three cubic examples have \(\deg P+\deg Q=3\). Adding further positive or negative charges, or increasing their integer multiplicities, changes only \(P\) and \(Q\); no new construction is needed.

## Theorem: the Newton graph from singular pencil members

Let \(f=P/Q\) be as above, and consider the continuous Newton equation

$$
\dot z=-\frac{f(z)}{f'(z)}.
$$

Then:

1. Away from zeros, poles, and critical points,

$$
-\frac{f(z)}{f'(z)}
=
-\frac{\mathcal E(z)}{|\mathcal E(z)|^2}.
$$

Thus Newton flow has exactly the same unparametrized curves as the planar force field, with the opposite orientation and a different speed.

2. Along every nonsingular Newton trajectory,

$$
\frac{d}{dt}f(z(t))=-f(z(t)),
\qquad
f(z(t))=e^{-t}f(z(0)).
$$

Hence each trajectory is the lift of a radial segment in the value plane and lies on one member \(\mathcal C_\theta\) of the real algebraic pencil.

3. If \(w\) is a simple critical point away from the charges, multiply the Newton vector field by the positive factor \(|P'Q-PQ'|^2\). The resulting desingularized field is smooth, \(w\) is a saddle, and its four local separatrices are exactly the four local branches of the singular member

$$
\mathcal C_{\arg f(w)}.
$$

4. Under the generic assumptions that the zeros, poles, and critical points are simple and there are no saddle-to-saddle connections, every separatrix arm ends at a zero or a pole. Their union is the full Newton separatrix graph. The zero-going arms form the zero-side Newton graph; the pole-going arms form its dual.

For a polynomial, the only pole is at infinity and the finite zero-side Newton graph is a tree. For a generic rational map, the zero-side graph generally has cycles, and its faces are the pole basins. Multiple charges, such as the \(+2\) charge in the weighted example, are nongeneric degenerations but remain visible as limits of the same construction.

## The orthogonal lemniscate pencil

The equipotential curves form the orthogonal real algebraic family

$$
|P(z)|^2-\rho^2|Q(z)|^2=0.
$$

Its singular members are the critical lemniscates

$$
|f(z)|=|f(w)|,
\qquad f'(w)=0.
$$

At a simple critical point the lemniscate also has a four-pronged node, rotated by \(\pi/4\) from the Newton separatrices. The field-line and equipotential pencils are the two trajectory families of the quadratic differential

$$
\left(\frac{f'}f\right)^2dz^2.
$$

## Why this geometry may matter for Sendov-type questions

The algebraic degree alone gives only coarse length bounds. The more promising structure is that a root-to-critical separatrix is not an arbitrary algebraic arc: it is a distinguished branch of a singular pencil member and, equivalently, an inverse image of a radial segment under \(f\).

If \(w\) is the critical endpoint and \(a\) the root endpoint, a canonical parameter is

$$
f(z(\tau))=\tau f(w),
\qquad 0\le\tau\le1.
$$

Then

$$
z'(\tau)=\frac{f(w)}{f'(z(\tau))}.
$$

The direct displacement is the vector integral

$$
w-a=\int_0^1\frac{f(w)}{f'(z(\tau))}\,d\tau,
$$

whereas the arc length is the corresponding integral of the modulus. The difference is exactly the cancellation caused by the turning, or “hooking,” of the algebraic branch.

This suggests a sharper program than bounding total algebraic length: understand the distinguished singular branch well enough to control its radial turning, its intersections with root-centered circles, or the phase variation of \(f'\) along the inverse ray.

## Further directions

The interactive is deliberately limited to small configurations, where the entire pencil and Newton graph can be redrawn live. Natural extensions include:

- tracing a rational parametrization of a selected nodal cubic from its node;
- displaying the inverse-ray parameter \(	au=f(z)/f(w)\) along a separatrix;
- comparing Euclidean chord length, arc length, and radial variation;
- showing the same graph on the Riemann sphere when a branch passes through infinity;
- testing whether the first merging saddle attached to a root obeys stronger Sendov-type bounds.
