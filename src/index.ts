import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { jwt, sign, verify } from 'hono/jwt'

import creativesRoute  from './routes/creatives.route.js'
import categoriesRoute from './routes/categories.route.js'
import eventsRoute     from './routes/events.route.js'
import mediaRoute      from './routes/media.route.js'
import tasksRoute      from './routes/tasks.route.js'

const app = new Hono()
const JWT_SECRET = process.env.JWT_SECRET || 'mysuperkey1026'

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: 'http://localhost:4200',   // your Angular dev URL
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/', (c) => c.json({ message: 'API is running' }))

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json()

  //DB
  if (username === 'root' && password === '123456') {
    const token = await sign(
      { sub: username, role: 'admin', exp: Math.floor(Date.now() / 1000) + 60 * 60 },
      JWT_SECRET
    )
    return c.json({ token })
  }

  return c.json({ error: 'Invalid credentials' }, 401)
})

// Routes
app.route('/creatives',  creativesRoute)
app.route('/categories', categoriesRoute)
app.route('/events',     eventsRoute)
app.route('/media',      mediaRoute)
app.route('/tasks',      tasksRoute)

//Protected routes
const protectedRoutes = new Hono()

protectedRoutes.use('*', jwt({ secret: JWT_SECRET, alg: 'HS256' }))

protectedRoutes.get('/profile', (c) => {
  const payload = c.get('jwtPayload') as { sub: string; role: string }
  return c.json({ user: payload.sub, role: payload.role })
})

protectedRoutes.get('/items', (c) => {
  return c.json({ items: ['Item A', 'Item B', 'Item C'] })
})

protectedRoutes.post('/items', async (c) => {
  const { name } = await c.req.json()
  return c.json({ message: `Created item: ${name}` }, 201)
})

app.route('/api/protected', protectedRoutes)

// 404 handler
app.notFound((c) => c.json({ error: 'Route not found' }, 404))

// Start server
const port = Number(process.env.PORT) || 3000
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`)
})