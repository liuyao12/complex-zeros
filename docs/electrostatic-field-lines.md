# Electrostatic field lines, algebraic pencils, and Newton graphs

A finite configuration of signed point charges in the plane can be packaged into one rational function. Once this is done, three pictures that at first look unrelated become the same picture:

- electrostatic field lines of the signed configuration;
- constant-argument curves of a rational function;
- trajectories and separatrices of the continuous Newton method.

The field lines form a pencil of real algebraic curves. Its singular members pass through the equilibrium points of the charge configuration, and their singular branches make up the Newton graph.

The floating diagram follows the text. Its blue circles are zeros, its rose diamonds are poles, and its orange circles are critical points. Drag the zeros and poles. The angle slider selects one member of the real algebraic pencil; **Jump to a singular member** chooses the member through a critical point.

## One function for a signed point configuration

Put positive integer charges at points \(a_i\), and negative integer charges at points \(b_j\). Write

$$
f(z)=C\,\frac{\prod_i (z-a_i)^{m_i}}{\prod_j (z-b_j)^{n_j}}=\frac{P(z)}{Q(z)}.
$$

The logarithmic potential and its harmonic conjugate are

$$
\Phi(z)=\log|f(z)|,
\qquad
\Psi(z)=\arg f(z).
$$

Away from the zeros and poles,

$$
\frac{f'(z)}{f(z)}
=
\sum_i\frac{m_i}{z-a_i}
-
\sum_j\frac{n_j}{z-b_j}.
$$

In complex-vector notation the Bôcher electrostatic field is

$$
\mathcal E(z)=\nabla\Phi(z)=\overline{\frac{f'(z)}{f(z)}}.
$$

The continuous Newton equation is

$$
\dot z=-\frac{f(z)}{f'(z)}
=-\frac{\mathcal E(z)}{|\mathcal E(z)|^2}.
$$

Thus the two vector fields have exactly the same unoriented trajectories, with opposite orientation and a different speed. Bôcher's field runs from zeros to poles; Newton flow runs from poles to zeros.

Because \(\Phi\) and \(\Psi\) are harmonic conjugates, the field lines are

$$
\arg f(z)=\theta,
$$

and the orthogonal equipotential curves are

$$
|f(z)|=\rho.
$$

## Two points with opposite signs: a pencil of circles

Take a zero at \(-1\) and a pole at \(1\):

$$
f(z)=\frac{z+1}{z-1}.
$$

A field line has \(\arg f(z)=\theta\). Multiplying by the positive quantity \(|z-1|^2\), this is

$$
\operatorname{Im}\!\left(e^{-i\theta}(z+1)(\bar z-1)\right)=0.
$$

Writing \(z=x+iy\), one obtains

$$
\sin\theta\,(x^2+y^2-1)+2\cos\theta\,y=0.
$$

For \(\sin\theta\ne0\), this becomes

$$
x^2+(y+\cot\theta)^2=\csc^2\theta.
$$

So the field lines are precisely the circles through the two charged points. The limiting member \(\theta=0\) is the real axis. This is the familiar coaxal circle pencil of a dipole.

## Two points with like signs: a pencil of rectangular hyperbolas

Now take two zeros and no finite pole:

$$
P(z)=(z-1)(z+1)=z^2-1.
$$

The field-line equation is

$$
\operatorname{Im}\!\left(e^{-i\theta}(z^2-1)\right)=0,
$$

or explicitly

$$
2xy\cos\theta-(x^2-y^2-1)\sin\theta=0.
$$

Every nondegenerate member is a rectangular hyperbola through \(-1\) and \(1\). The equilibrium point is \(w=0\), because \(P'(z)=2z\). At the critical angle \(\theta=\arg P(0)\pmod\pi\), the hyperbola degenerates into two crossing lines. The equilibrium point is exactly the node of the singular member.

This already contains the local Newton-graph picture: after desingularizing the Newton field, the four branches through the node alternate between branches flowing toward the two zeros and branches flowing toward the pole at infinity.

## Three points: a cubic pencil

For three zeros, take for example

$$
P(z)=(z+1)(z-1)(z-i).
$$

The field lines form the real cubic pencil

$$
\mathcal C_\theta:
\quad
\operatorname{Im}\!\left(e^{-i\theta}P(z)\right)=0.
$$

The three zeros are base points: every member of the pencil passes through them. The two critical points are

$$
w_\pm=\frac{\pm\sqrt2+i}{3},
$$

because \(P'(w_\pm)=0\).

For a generic angle, \(\mathcal C_\theta\) is a smooth real cubic near the critical points. But when

$$
\theta=\arg P(w_\pm)\pmod\pi,
$$

the corresponding cubic is singular at \(w_\pm\). If the critical point is simple, then locally

$$
P(z)=P(w)+\frac{P''(w)}2(z-w)^2+O((z-w)^3),
$$

so the singular member has the leading equation

$$
\operatorname{Im}\!\left(e^{-i\arg P(w)}P''(w)(z-w)^2\right)=0.
$$

That is an ordinary real node with four branches. These four branches are the Newton separatrices through \(w\).

A nodal cubic is rational: projection from its node gives a rational parametrization. This special fact is one reason the three-point case is especially concrete. In higher degree, one node is generally not enough to make the singular member rational.

## The real algebraic pencil for zeros and poles

For a general rational function \(f=P/Q\), multiply the constant-argument equation by \(|Q|^2\). The field-line pencil is

$$
\mathcal C_\theta:
\quad
\operatorname{Im}\!\left(e^{-i\theta}P(z)\overline{Q(z)}\right)=0.
$$

If

$$
U(x,y)=\operatorname{Re}(P(z)\overline{Q(z)}),
\qquad
V(x,y)=\operatorname{Im}(P(z)\overline{Q(z)}),
$$

then the same pencil can be written

$$
sU+tV=0,
\qquad [s:t]\in\mathbb{RP}^1.
$$

It is a pencil of real algebraic curves of degree at most

$$
\deg P+\deg Q.
$$

Every zero and every pole is a base point, since \(P\overline Q=0\) there.

The finite nonzero critical points are the roots of

$$
D(z)=P'(z)Q(z)-P(z)Q'(z).
$$

At a point \(w\) with \(D(w)=0\), the member with \(\theta=\arg f(w)\pmod\pi\) is singular. Conversely, away from zeros and poles, a singular point of a member of the pencil is a critical point of \(f\).

The three-point mixed example

$$
f(z)=\frac{z^2-1}{z-i}
$$

already produces a cubic pencil, now based at two zeros and one pole. Its singular cubic branches alternate between zero-going and pole-going separatrices.

## From singular members to the Newton graph

Along Newton flow,

$$
\frac{d}{dt}f(z(t))=f'(z(t))\dot z(t)=-f(z(t)),
$$

hence

$$
f(z(t))=e^{-t}f(z(0)).
$$

Every Newton trajectory is therefore a lift of a radial line in the value plane. Its argument is constant, so it lies on one member of the real algebraic pencil.

At a simple critical point, the four branches of the singular member alternate as follows:

- two forward-time branches go to zeros;
- two backward-time branches go to poles, including the pole at infinity in the polynomial case.

The union of these distinguished branches over all critical points is the full separatrix graph. Keeping only the zero-going branches gives the zero-side Newton graph; keeping the pole-going branches gives its dual. For a polynomial the sole pole is at infinity, and the finite zero-side graph is a tree. For a generic rational map, the zero-side graph generally has cycles, with the pole basins as faces.

## The orthogonal lemniscate pencil

The equipotential curves form another real algebraic family:

$$
|P(z)|^2-\rho^2|Q(z)|^2=0.
$$

Its singular members are the critical lemniscates

$$
|f(z)|=|f(w)|,
\qquad f'(w)=0.
$$

At a simple critical point the lemniscate also has a four-pronged node, rotated by \(\pi/4\) from the Newton separatrices. The two pencils are the horizontal and vertical trajectory families of the quadratic differential

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

whereas the arc length is the corresponding integral of the modulus. The difference is precisely the cancellation caused by the turning, or “hooking,” of the algebraic branch.

This suggests a sharper program than bounding total algebraic length: understand the distinguished singular branch well enough to control its radial turning, its intersections with root-centered circles, or the phase variation of \(f'\) along the inverse ray.

## Further directions

The interactive is deliberately limited to small configurations, where the entire pencil and Newton graph can be redrawn live. Natural extensions include:

- tracing a rational parametrization of a selected nodal cubic from its node;
- displaying the inverse-ray parameter \(\tau=f(z)/f(w)\) along a separatrix;
- comparing Euclidean chord length, arc length, and radial variation;
- showing the same graph on the Riemann sphere when a branch passes through infinity;
- testing whether the first merging saddle attached to a root obeys stronger Sendov-type bounds.
