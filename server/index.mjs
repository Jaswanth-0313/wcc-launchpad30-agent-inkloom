import express from 'express'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { MongoClient, ObjectId } from 'mongodb'

const app = express()
const port = Number(process.env.PORT || 10000)
const configuredOrigins = (process.env.APP_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredOrigins,
])

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const mongoClient = process.env.MONGODB_URI ? new MongoClient(process.env.MONGODB_URI) : null
let projectsCollectionPromise

app.disable('x-powered-by')
app.use((request, response, next) => {
  const origin = request.headers.origin

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

  if (request.method === 'OPTIONS') {
    if (origin && !allowedOrigins.has(origin)) return response.status(403).end()
    return response.status(204).end()
  }

  if (origin && !allowedOrigins.has(origin)) return response.status(403).json({ error: 'Origin is not allowed.' })
  return next()
})
app.use(express.json({ limit: '1mb' }))

const aiRequests = new Map()

function aiRateLimit(request, response, next) {
  const key = request.user?.id || request.ip || 'unknown'
  const now = Date.now()
  const windowStart = now - 60_000
  const recentRequests = (aiRequests.get(key) || []).filter((timestamp) => timestamp > windowStart)

  if (recentRequests.length >= 20) return response.status(429).json({ error: 'Too many AI requests. Try again shortly.' })

  recentRequests.push(now)
  aiRequests.set(key, recentRequests)
  return next()
}

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'inkloom-api',
    configured: {
      openai: Boolean(openai),
      mongodb: Boolean(mongoClient),
      supabase: Boolean(supabase),
    },
  })
})

async function requireUser(request, response, next) {
  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : ''

  if (!supabase || !token) return response.status(401).json({ error: 'A valid Supabase access token is required.' })

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return response.status(401).json({ error: 'The Supabase access token is invalid or expired.' })

    request.user = data.user
    return next()
  } catch (error) {
    console.error('Supabase token verification failed:', error instanceof Error ? error.message : 'unknown error')
    return response.status(503).json({ error: 'Authentication service is unavailable.' })
  }
}

function getGenerationInput(body) {
  const stage = typeof body?.stage === 'string' ? body.stage.trim() : ''
  const context = body?.context

  if (!stage || !context || typeof context !== 'object' || Array.isArray(context)) {
    return { error: 'Request must include a stage and context object.' }
  }

  if (stage.length > 80 || JSON.stringify(context).length > 100_000) {
    return { error: 'The stage or context is too large.' }
  }

  return { stage, context }
}

function getAnalysisInput(body) {
  const problem = typeof body?.problem === 'string' ? body.problem.trim() : ''
  const context = body?.context && typeof body.context === 'object' && !Array.isArray(body.context) ? body.context : {}

  if (!problem) return { error: 'Request must include a problem statement.' }
  if (problem.length > 20_000 || JSON.stringify(context).length > 100_000) return { error: 'The problem or context is too large.' }

  return { problem, context }
}

async function completeAnalysis(problem, context) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are Inkloom, an innovation analysis agent. Return valid JSON only with these keys: problemUnderstanding, targetUsers, painPoints, valueProposition, proposedSolutions, objectivesAndScope, innovationAndAi, businessModelCanvas, technicalArchitecture, developmentRoadmap, risksAndValidation, finalProjectSummary. Preserve user-provided facts, label assumptions and estimates, never invent verified market statistics, and explain when AI is not necessary.',
      },
      {
        role: 'user',
        content: JSON.stringify({ problem, context }),
      },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('The AI provider returned an empty response.')

  try {
    return JSON.parse(content)
  } catch {
    throw new Error('The AI provider returned invalid JSON.')
  }
}

app.post('/api/ai/analyze', requireUser, aiRateLimit, async (request, response) => {
  if (!openai) return response.status(503).json({ error: 'AI analysis is not configured. Add OPENAI_API_KEY and OPENAI_MODEL to the backend service.' })

  const input = getAnalysisInput(request.body)
  if (input.error) return response.status(400).json({ error: input.error })

  try {
    const analysis = await completeAnalysis(input.problem, input.context)
    return response.json({ analysis })
  } catch (error) {
    console.error('OpenAI analysis failed:', error instanceof Error ? error.message : 'unknown error')
    return response.status(502).json({ error: 'AI analysis failed. Please retry shortly.' })
  }
})

app.post('/api/ai/generate', requireUser, aiRateLimit, async (request, response) => {
  if (!openai) return response.status(503).json({ error: 'OpenAI is not configured on this server.' })

  const input = getGenerationInput(request.body)
  if (input.error) return response.status(400).json({ error: input.error })

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an Inkloom innovation agent. Return valid JSON only. Preserve approved decisions, separate assumptions from facts, and use concrete language.',
        },
        {
          role: 'user',
          content: JSON.stringify({ stage: input.stage, context: input.context }),
        },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return response.status(502).json({ error: 'The AI provider returned an empty response.' })

    let result
    try {
      result = JSON.parse(content)
    } catch {
      return response.status(502).json({ error: 'The AI provider returned invalid JSON.' })
    }

    return response.json({ stage: input.stage, result })
  } catch (error) {
    console.error('OpenAI request failed:', error instanceof Error ? error.message : 'unknown error')
    return response.status(502).json({ error: 'The AI provider request failed.' })
  }
})

async function getProjectsCollection() {
  if (!mongoClient) throw new Error('MongoDB is not configured on this server.')
  if (!projectsCollectionPromise) {
    projectsCollectionPromise = mongoClient.connect().then((client) => {
      const database = client.db(process.env.MONGODB_DB_NAME || 'inkloom')
      return database.collection('projects')
    })
  }
  return projectsCollectionPromise
}

function getProjectObjectId(value) {
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null
}

app.get('/api/projects', requireUser, async (request, response) => {
  try {
    const collection = await getProjectsCollection()
    const projects = await collection.find({ userId: request.user.id }).sort({ updatedAt: -1 }).limit(50).toArray()
    return response.json({ projects })
  } catch (error) {
    console.error('MongoDB read failed:', error instanceof Error ? error.message : 'unknown error')
    return response.status(503).json({ error: 'Project storage is unavailable.' })
  }
})

app.get('/api/projects/:id', requireUser, async (request, response) => {
  const projectId = getProjectObjectId(request.params.id)
  if (!projectId) return response.status(400).json({ error: 'Invalid project id.' })

  try {
    const collection = await getProjectsCollection()
    const project = await collection.findOne({ _id: projectId, userId: request.user.id })
    if (!project) return response.status(404).json({ error: 'Project not found.' })
    return response.json({ project })
  } catch (error) {
    console.error('MongoDB read failed:', error instanceof Error ? error.message : 'unknown error')
    return response.status(503).json({ error: 'Project storage is unavailable.' })
  }
})

app.post('/api/projects', requireUser, async (request, response) => {
  const project = request.body?.project
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    return response.status(400).json({ error: 'Request must include a project object.' })
  }

  if (JSON.stringify(project).length > 100_000) return response.status(400).json({ error: 'The project is too large.' })

  try {
    const collection = await getProjectsCollection()
    const now = new Date()
    const result = await collection.insertOne({
      userId: request.user.id,
      project,
      createdAt: now,
      updatedAt: now,
    })
    return response.status(201).json({ id: result.insertedId.toString() })
  } catch (error) {
    console.error('MongoDB write failed:', error instanceof Error ? error.message : 'unknown error')
    return response.status(503).json({ error: 'Project storage is unavailable.' })
  }
})

app.put('/api/projects/:id', requireUser, async (request, response) => {
  const projectId = getProjectObjectId(request.params.id)
  const project = request.body?.project
  if (!projectId) return response.status(400).json({ error: 'Invalid project id.' })
  if (!project || typeof project !== 'object' || Array.isArray(project)) return response.status(400).json({ error: 'Request must include a project object.' })
  if (JSON.stringify(project).length > 100_000) return response.status(400).json({ error: 'The project is too large.' })

  try {
    const collection = await getProjectsCollection()
    const result = await collection.updateOne(
      { _id: projectId, userId: request.user.id },
      { $set: { project, updatedAt: new Date() } },
    )
    if (!result.matchedCount) return response.status(404).json({ error: 'Project not found.' })
    return response.json({ id: projectId.toString() })
  } catch (error) {
    console.error('MongoDB update failed:', error instanceof Error ? error.message : 'unknown error')
    return response.status(503).json({ error: 'Project storage is unavailable.' })
  }
})

app.delete('/api/projects/:id', requireUser, async (request, response) => {
  const projectId = getProjectObjectId(request.params.id)
  if (!projectId) return response.status(400).json({ error: 'Invalid project id.' })

  try {
    const collection = await getProjectsCollection()
    const result = await collection.deleteOne({ _id: projectId, userId: request.user.id })
    if (!result.deletedCount) return response.status(404).json({ error: 'Project not found.' })
    return response.status(204).end()
  } catch (error) {
    console.error('MongoDB delete failed:', error instanceof Error ? error.message : 'unknown error')
    return response.status(503).json({ error: 'Project storage is unavailable.' })
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Inkloom API listening on port ${port}`)
})
