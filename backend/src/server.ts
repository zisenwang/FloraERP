import app from './app'

const PORT = process.env.PORT || 3001
const IP = process.env.DB_HOST
const SCHEMA = process.env.DB_NAME

app.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`服务器运行在端口 ${PORT}`)
  console.log(`当前使用数据库 - 地址：${IP}，数据库名：${SCHEMA}`)
})
