import "dotenv/config"
import { Client } from "pg"

const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const id = process.argv[2] || "cmspnrao0000ay8fwsu24fvs0"

const rows = await client.query(
  `SELECT t.id, t.title, t."columnId", c.name AS col
   FROM "Task" t JOIN "Column" c ON c.id = t."columnId"
   WHERE t.id = $1`,
  [id]
)
console.log("TASK ID:", JSON.stringify(rows.rows, null, 2))

// duplicate tasks sharing the same (columnId, title) to catch created-twice bugs
const dup = await client.query(
  `SELECT "columnId", title, COUNT(*) FROM "Task"
   GROUP BY "columnId", title HAVING COUNT(*) > 1 LIMIT 20`
)
console.log("DUP TITLE/COLUMN:", JSON.stringify(dup.rows, null, 2))

await client.end()
