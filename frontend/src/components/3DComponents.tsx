import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei'
import * as THREE from 'three'

export function TechOrb({ audioLevel }: { audioLevel: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const geometryRef = useRef<THREE.IcosahedronGeometry>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.01
    }
    });
    useEffect(() => {
        if (meshRef.current) {
          const detail = 4 + Math.floor(audioLevel * 10);
          const newGeometry = new THREE.IcosahedronGeometry(1, detail);
          
          if (meshRef.current.geometry) {
            meshRef.current.geometry.dispose(); // Dispose of old geometry to avoid memory leaks
          }
          
          meshRef.current.geometry = newGeometry; // Assign the new geometry to the mesh
        }
      }, [audioLevel]); // Re-run this effect whenever audioLevel changes
    
      return (
        <mesh ref={meshRef}>
          <icosahedronGeometry ref={geometryRef} args={[1, 4]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      );
    }

export function TechRings({ audioLevel }: { audioLevel: number }) {
  const ringsRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (ringsRef.current) {
      ringsRef.current.rotation.x += 0.002
      ringsRef.current.rotation.y += 0.003
    }
  })

  return (
    <group ref={ringsRef}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[0, 0, 0]}>
          <torusGeometry args={[1.5 + index * 0.5, 0.02, 16, 100]} />
          <MeshWobbleMaterial
            color="#00FFFF"
            factor={0.1 + audioLevel * 0.5}
            speed={2}
            opacity={0.7}
            transparent
          />
        </mesh>
      ))}
    </group>
  )
}