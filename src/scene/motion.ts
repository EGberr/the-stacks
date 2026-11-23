import * as THREE from 'three';

/**
 * Everything that moves in the library is a damped spring chasing a target.
 * Springs can be retargeted mid-flight without a jump, which is what makes
 * interrupted gestures feel continuous.
 */
export class Spring {
  value: number;
  target: number;
  velocity = 0;

  constructor(
    value: number,
    public stiffness = 120,
    public damping = 16
  ) {
    this.value = value;
    this.target = value;
  }

  step(dt: number): number {
    // Semi-implicit Euler, sub-stepped so stiff springs stay stable on slow frames.
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.velocity += (-this.stiffness * (this.value - this.target) - this.damping * this.velocity) * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  snap(value: number): void {
    this.value = this.target = value;
    this.velocity = 0;
  }
}

export class Spring3 {
  readonly value: THREE.Vector3;
  readonly target: THREE.Vector3;
  private velocity = new THREE.Vector3();

  constructor(
    value: THREE.Vector3,
    public stiffness = 60,
    public damping = 11
  ) {
    this.value = value.clone();
    this.target = value.clone();
  }

  step(dt: number): THREE.Vector3 {
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.velocity.x += (-this.stiffness * (this.value.x - this.target.x) - this.damping * this.velocity.x) * h;
      this.velocity.y += (-this.stiffness * (this.value.y - this.target.y) - this.damping * this.velocity.y) * h;
      this.velocity.z += (-this.stiffness * (this.value.z - this.target.z) - this.damping * this.velocity.z) * h;
      this.value.addScaledVector(this.velocity, h);
    }
    return this.value;
  }

  snap(value: THREE.Vector3): void {
    this.value.copy(value);
    this.target.copy(value);
    this.velocity.set(0, 0, 0);
  }
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 4);

/** The equivalent of `to` nearest to `from`, so a turn takes the short way round. */
export function nearestAngle(from: number, to: number): number {
  const TAU = Math.PI * 2;
  return from + ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
}
