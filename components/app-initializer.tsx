"use client"

import { useEffect } from "react"

export function AppInitializer() {
  useEffect(() => {
    // Initialize the app on client mount
    fetch("/api/init").catch(console.error)
  }, [])

  return null
}
