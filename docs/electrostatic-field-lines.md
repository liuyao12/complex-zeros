# Planar electrostatic field lines, algebraic pencils, and Newton graphs

The simplest signed point configurations in the plane already draw familiar algebraic curves. Here the force from a unit point charge has magnitude \(1/r\), rather than the \(1/r^2\) law of three-dimensional electrostatics. Equivalently, the potential of one charge is \(\log r\).

With two opposite charges, the field lines are circles. With two like charges, they are rectangular hyperbolas. These facts can be checked directly from the vector field, without complex variables. Complex functions become useful only with the three-point case: they explain the pattern, show that the field lines form a pencil of real algebraic curves, and identify the singular members with equilibrium points and Newton separatrices.

The floating diagram follows the examples as you read. Blue circles are positive charges, rose diamonds are negative charges, and orange circles are equilibrium points. Drag the charges. The angle slider selects one member of the pencil; **Jump to a singular member** chooses a member through an equilibrium point.

Begin with [opposite charges](#two-points-with-opposite-signs-a-pencil-of-circles), then [like charges](#two-points-with-like-signs-a-pencil-of-rectangular-hyperbolas), [three positive charges](#three-points-the-complex-encoding-and-a-cubic-pencil), and [a mixed three-point configuration](#three-signed-points-two-positive-and-one-negative-charge).

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

## Three points: the complex encoding and a cubic pencil

With three points, a direct elimination is still possible, but complex notation explains the whole construction at once.

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

Negative charges give negative exponents, so in general \(f\) is rational. Its logarithmic derivative satisfies

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

For three positive unit charges at \(-1\), \(1\), and \(i\), take

$$
P(z)=(z+1)(z-1)(z-i).
$$

The field lines form the real cubic pencil

$$
\mathcal C_\theta:
\quad
\operatorname{Im}\!\left(e^{-i\theta}P(z)\right)=0.
$$

The three charges are base points: every cubic in the pencil passes through them. Away from the charges, an equilibrium is characterized by

$$
\mathcal E(w)=0
\quad\Longleftrightarrow\quad
P'(w)=0.
$$

Here the two equilibrium points are

$$
w_\pm=\frac{\pm\sqrt2+i}{3}.
$$

For a generic angle, \(\mathcal C_\theta\) is smooth near both points. When

$$
\theta=\arg P(w_\pm)\pmod\pi,
$$

the corresponding cubic is singular at \(w_\pm\). Indeed, if \(w\) is a simple equilibrium, then

$$
P(z)=P(w)+\frac{P''(w)}2(z-w)^2+O((z-w)^3),
$$

so the singular member has leading equation

$$
\operatorname{Im}\!\left(
 e^{-i\arg P(w)}P''(w)(z-w)^2
\right)=0.
$$

This is an ordinary real node with four branches. A nodal cubic is rational: projection from its node gives a rational parametrization. This makes the three-point case unusually explicit, although in higher degree a single node is generally not enough to make the curve rational.

### The precise statement

Let positive integer charges be placed at the zeros of a polynomial \(P\), and negative integer charges at the zeros of a polynomial \(Q\), with \(P\) and \(Q\) coprime. Put

$$
f(z)=\frac{P(z)}{Q(z)}.
$$

For each \(\theta\in\mathbb R/\pi\mathbb Z\), define

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
2. Each \(\mathcal C_\theta\) is a real algebraic curve of degree at most \(\deg P+\deg Q\), and every charge is a base point of the pencil.
3. A point \(w\) away from the charges is an equilibrium if and only if \(f'(w)=0\). In that case the unique member through \(w\), namely \(\theta=\arg f(w)\pmod\pi\), is singular at \(w\).
4. If \(w\) is a simple critical point of \(f\), the singularity is an ordinary node with four local branches.

Finally, the continuous Newton field is

$$
\dot z=-\frac{f(z)}{f'(z)}
=-\frac{\mathcal E(z)}{|\mathcal E(z)|^2}.
$$

It has the same trajectories with the opposite orientation and a different speed. After desingularization, the four nodal branches are the Newton separatrices through \(w\).

The circle and hyperbola pencils above are the degree-two instances of this statement. From this point onward, adding more positive or negative charges changes only \(P\) and \(Q\); the construction itself is unchanged.

## Three signed points: two positive and one negative charge

The first mixed three-point example is

$$
f(z)=\frac{z^2-1}{z-i}.
$$

It represents positive charges at \(-1\) and \(1\), and a negative charge at \(i\). Its field-line pencil is

$$
\operatorname{Im}\!\left(
 e^{-i\theta}(z^2-1)(\bar z+i)
\right)=0,
$$

again a real cubic pencil. The equilibrium points are the roots of

$$
P'(z)Q(z)-P(z)Q'(z)=0,
$$

which here is

$$
z^2-2iz+1=0.
$$

Thus

$$
w_\pm=i(1\pm\sqrt2).
$$

At either critical angle \(\theta=\arg f(w_\pm)\), the cubic has a four-pronged node. This time the branches visibly alternate between branches leading to positive charges and branches leading to the negative charge. The singular cubic already contains both halves of the rational Newton graph.

## From singular members to the Newton graph

Along the continuous Newton flow,

$$
\frac{d}{dt}f(z(t))
=f'(z(t))\dot z(t)
=-f(z(t)),
$$

so

$$
f(z(t))=e^{-t}f(z(0)).
$$

Every Newton trajectory is a lift of a radial line in the value plane. Its argument is constant, so it lies on one member of the real algebraic pencil.

At a simple critical point, the four branches of the singular member alternate as follows:

- two forward-time branches go to zeros, or positive charges;
- two backward-time branches go to poles, or negative charges, including the pole at infinity in the polynomial case.

The union of these distinguished branches over all critical points is the full separatrix graph. Keeping only the zero-going branches gives the zero-side Newton graph; keeping the pole-going branches gives its dual. For a polynomial the sole pole is at infinity, and the finite zero-side graph is a tree. For a generic rational map, the zero-side graph generally has cycles, with the pole basins as faces.

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
- displaying the inverse-ray parameter \(\tau=f(z)/f(w)\) along a separatrix;
- comparing Euclidean chord length, arc length, and radial variation;
- showing the same graph on the Riemann sphere when a branch passes through infinity;
- testing whether the first merging saddle attached to a root obeys stronger Sendov-type bounds.
