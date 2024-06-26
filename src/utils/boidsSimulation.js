//TODO: implement

// import * as THREE from "three";
// import { Boid } from "./Boid";

// export class BoidSimulation {
//     /**
//      *
//      * @param {*} boids
//      * @param {*} separationWeight
//      * @param {*} alignmentWeight
//      * @param {*} cohesionWeight
//      * @param {*} wanderWeight
//      * @param {*} separationRange
//      * @param {*} alignmentRange
//      * @param {*} cohesionRange
//      */
//     constructor(
//         boids,
//         separationWeight,
//         alignmentWeight,
//         cohesionWeight,
//         wanderWeight,
//         separationRange,
//         alignmentRange,
//         cohesionRange
//     ) {
//         this.boids = boids;
//         this.separationWeight = separationWeight;
//         this.alignmentWeight = alignmentWeight;
//         this.cohesionWeight = cohesionWeight;
//         this.wanderWeight = wanderWeight;
//         this.separationRange = separationRange;
//         this.alignmentRange = alignmentRange;
//         this.cohesionRange = cohesionRange;
//     }

//     update(target) {
//         this.boids.forEach((boid) => {
//             const neighbors = this.getNeighbors(boid);
//             const acceleration = this.#applyBoidAlgorithm(
//                 boid,
//                 target,
//                 neighbors
//             );
//             boid.update(acceleration);
//         });
//     }

//     getNeighbors(boid) {
//         return this.boids.filter((otherBoid) => otherBoid !== boid);
//     }

//     /**
//      *
//      * @param {THREE.Vector3} target Desired target position
//      * @param {*} neighbors All the bee neighbors
//      * @returns calculated acceleration
//      */
//     #applyBoidAlgorithm(boid, target, neighbors) {
//         let acceleration = new THREE.Vector3(
//             boid.velocity.x,
//             boid.velocity.y,
//             boid.velocity.z
//         );

//         const targetVelocity = new THREE.Vector3()
//             .subVectors(target, boid.position)
//             .normalize()
//             .multiplyScalar(boid.minSpeed);

//         const separationVelocity = this.separation(
//             boid,
//             neighbors
//         ).multiplyScalar(this.separationWeight);
//         const alignmentVelocity = this.alignment(
//             boid,
//             neighbors
//         ).multiplyScalar(this.alignmentWeight);
//         const cohesionVelocity = this.cohesion(boid, neighbors).multiplyScalar(
//             this.cohesionWeight
//         );
//         const wanderVelocity = this.wander(boid).multiplyScalar(
//             this.wanderWeight
//         );

//         acceleration.add(separationVelocity);
//         acceleration.add(alignmentVelocity);
//         acceleration.add(cohesionVelocity);
//         acceleration.add(targetVelocity);
//         acceleration.add(wanderVelocity);

//         if (acceleration.length() > boid.maxSpeed) {
//             acceleration.normalize().multiplyScalar(boid.maxSpeed);
//         }

//         return acceleration;
//     }
//     /**
//      * Separation logic
//      * @param {Bee[]} neighbors
//      * @returns {THREE.Vector3} velocity vector for separation
//      */
//     #separation(boid, neighbors) {
//         let separationForce = new THREE.Vector3();

//         neighbors.forEach((neighbour) => {
//             const distance = neighbour.beeMesh.position.distanceTo(
//                 boid.position
//             );

//             // separation force increases inversely with distance,
//             // so boids that get too close to each other will be pushed back with greater force.
//             if (distance < this.separationRange && distance > 0) {
//                 let repulsion = new THREE.Vector3()
//                     .subVectors(
//                         this.beeMesh.position,
//                         neighbour.beeMesh.position
//                     )
//                     .divideScalar(distance)
//                     .divideScalar(distance);
//                 separationForce.add(repulsion);
//             }
//         });

//         return separationForce;
//     }

//     /**
//      * Alignemnt logic
//      * @param {Bee[]} neighbors
//      * @returns {THREE.Vector3} velocity vector for alignment
//      */
//     #alignment(boid, neighbors) {
//         let avgVelocity = new THREE.Vector3();
//         let neighbourInRange = 0;

//         neighbors.forEach((neighbour) => {
//             const distance = neighbour.beeMesh.position.distanceTo(
//                 boid.position
//             );

//             if (distance < this.alignmentRange) {
//                 avgVelocity.add(neighbour.beeBody.velocity);
//                 neighbourInRange += 1;
//             }
//         });

//         if (neighbourInRange > 0)
//             avgVelocity
//                 .divideScalar(neighbourInRange)
//                 .sub(this.beeBody.velocity);

//         return avgVelocity;
//     }

//     /**
//      * Cohesion logic
//      * @param {Bee[]} neighbors
//      * @returns {THREE.Vector3} velocity vector for cohesion
//      */
//     #cohesion(neighbors) {
//         let avgPosition = new THREE.Vector3();
//         let neighbourInRange = 0;

//         neighbors.forEach((neighbour) => {
//             const distance = neighbour.beeMesh.position.distanceTo(
//                 this.beeMesh.position
//             );

//             if (distance < this.cohesionRange) {
//                 avgPosition.add(neighbour.beeMesh.position);
//                 neighbourInRange += 1;
//             }
//         });

//         if (neighbourInRange > 0)
//             avgPosition
//                 .divideScalar(neighbourInRange)
//                 .sub(this.beeMesh.position);

//         return avgPosition;
//     }
//     /**
//      * Wander logic
//      * @returns {THREE.Vector3} velocity vector for wandering
//      */
//     #wander() {
//         const wanderDistance = 500;
//         const wanderJitter = 50;

//         // Get a random vector within a cube, which extends from 2.5 to -2.5
//         const randomVector = new THREE.Vector3(
//             (Math.random() - 0.5) * 5,
//             (Math.random() - 0.5) * 5,
//             (Math.random() - 0.5) * 5
//         )
//             .normalize()
//             .multiplyScalar(wanderJitter);

//         let normalizedVelocity = new THREE.Vector3();
//         normalizedVelocity.set(
//             this.beeBody.velocity.x,
//             this.beeBody.velocity.y,
//             this.beeBody.velocity.z
//         );
//         normalizedVelocity = normalizedVelocity.normalize();

//         const circleCenter = normalizedVelocity.multiplyScalar(wanderDistance);

//         // Combine the circle center and the random vector to get the wander force
//         const wanderForce = circleCenter.add(randomVector);

//         return wanderForce;
//     }
// }
