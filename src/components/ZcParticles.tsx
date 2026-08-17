"use client"

// 综测看板 Three.js 粒子背景
// 浅色钢蓝粒子场 + 鼠标视差，移动端降载，组件卸载时完整释放 GPU 资源
import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function ZcParticles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isMobile = window.innerWidth < 768
    const isLowEnd = isMobile && window.devicePixelRatio > 2
    const count = prefersReduced ? 0 : isLowEnd ? 40 : isMobile ? 70 : 150

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.z = 12

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    let cleanup = () => {}

    if (count > 0) {
      // 远处大而淡的粒子 + 近处小而亮的粒子
      const makePoints = (n: number, size: number, opacity: number, depth: number) => {
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 26
          positions[i * 3 + 1] = (Math.random() - 0.5) * 18
          positions[i * 3 + 2] = (Math.random() - 0.5) * depth
        }
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        const material = new THREE.PointsMaterial({
          color: 0x3b6b8a,
          size,
          transparent: true,
          opacity,
          sizeAttenuation: true,
        })
        const points = new THREE.Points(geometry, material)
        scene.add(points)
        return { points, geometry, material }
      }

      const far = makePoints(Math.floor(count * 0.6), 0.09, 0.22, 18)
      const near = makePoints(Math.floor(count * 0.4), 0.05, 0.4, 8)

      // 鼠标视差
      let mx = 0, my = 0
      const onMove = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2
        my = (e.clientY / window.innerHeight - 0.5) * 2
      }
      window.addEventListener("mousemove", onMove, { passive: true })

      let raf = 0
      const tick = () => {
        far.points.rotation.y += 0.00035
        near.points.rotation.y -= 0.0006
        near.points.rotation.x += 0.00025
        camera.position.x += (mx * 0.7 - camera.position.x) * 0.035
        camera.position.y += (-my * 0.5 - camera.position.y) * 0.035
        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      cleanup = () => {
        cancelAnimationFrame(raf)
        window.removeEventListener("mousemove", onMove)
        far.geometry.dispose(); far.material.dispose()
        near.geometry.dispose(); near.material.dispose()
      }
    } else {
      // reduced-motion: 渲染一帧静态
      renderer.render(scene, camera)
    }

    const onResize = () => {
      if (container.clientWidth === 0) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cleanup()
      window.removeEventListener("resize", onResize)
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className="zc-bg" aria-hidden="true" />
}
