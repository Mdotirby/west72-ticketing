import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const requiredEnv = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const missing = requiredEnv.filter(key => !process.env[key])

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const app = express()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const port = Number(process.env.PORT || 3000)
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`
const stripeCurrency = process.env.STRIPE_CURRENCY || 'usd'

app.use(express.json())
app.use(express.static(__dirname))

app.get('/api/config', (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY })
})

app.post('/create-checkout-session', async (req, res) => {
  try {
    const eventId = req.body?.eventId
    const quantity = Number(req.body?.quantity || 1)

    if (!eventId) {
      return res.status(400).json({ error: 'Missing eventId.' })
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return res.status(400).json({ error: 'Quantity must be an integer between 1 and 20.' })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, description, price, image_url')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found.' })
    }

    const parsedPrice = Number(event.price)
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'Event has an invalid price.' })
    }

    const unitAmount = Math.round(parsedPrice * 100)

    const successUrl = `${appBaseUrl}/event.html?id=${event.id}&checkout=success`
    const cancelUrl = `${appBaseUrl}/event.html?id=${event.id}&checkout=cancel`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity,
          price_data: {
            currency: stripeCurrency,
            unit_amount: unitAmount,
            product_data: {
              name: event.title || 'Event Ticket',
              description: event.description || undefined,
              images: event.image_url ? [event.image_url] : undefined
            }
          }
        }
      ],
      metadata: {
        event_id: String(event.id),
        quantity: String(quantity)
      },
      customer_email: req.body?.customerEmail || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl
    })

    return res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return res.status(500).json({ error: 'Unable to create checkout session.' })
  }
})

app.listen(port, () => {
  console.log(`Server running at ${appBaseUrl}`)
})
