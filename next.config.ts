import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Edge 中间件无法读取 .env.local（无文件系统），必须构建时内联 AUTH_SECRET。
  // 安全提示：AUTH_SECRET 与 AUTH_URL 仅从环境变量读取，请勿在代码中硬编码；
  // 本地开发请在 .env.local 中配置（见 .env.example）。
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET || "",
    AUTH_URL: process.env.AUTH_URL || "http://localhost:3001",
  },
}

export default nextConfig
