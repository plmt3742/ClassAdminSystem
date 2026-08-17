// Seed: 导入学生名单（students.json），初始密码 = gr2 + 学号
// 说明：students.json 为本地数据文件（已被 .gitignore 排除，不随仓库发布）。
// 管理员账号：默认取名单第一条；也可通过环境变量 ADMIN_STUDENT_ID 指定。
const { PrismaClient } = require("@prisma/client")
const { hash } = require("bcryptjs")
const students = require("../students.json")

const p = new PrismaClient()

async function main() {
  const adminStudentId = process.env.ADMIN_STUDENT_ID || students[0]?.studentId

  for (let i = 0; i < students.length; i++) {
    const s = students[i]
    const rawPassword = "gr2" + s.studentId
    const hashed = await hash(rawPassword, 12)
    const uid = String(i + 1).padStart(4, "0")
    const role = s.studentId === adminStudentId ? "admin" : "student"

    await p.user.upsert({
      where: { studentId: s.studentId },
      update: { name: s.name, role },
      create: {
        uid,
        studentId: s.studentId,
        name: s.name,
        password: hashed,
        role,
      },
    })
    console.log(`${uid} ${s.studentId} ${s.name}`)
  }
  console.log(`\nImported ${students.length} students. Admin: ${adminStudentId}`)
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
