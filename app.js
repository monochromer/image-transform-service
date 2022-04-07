import http from 'node:http'
import https from 'node:https'
import { once } from 'node:events'
import { pipeline } from 'node:stream/promises'
import { URL } from 'node:url'
import sharp from 'sharp'
import { HTTPError }  from './errors.js'
import { AVAILABLE_FORMATS } from './formats.js'

async function handler(request, response) {
  try {
    const { searchParams: params } = new URL(request.url, 'http://localhost')
    const sourceImageURL = params.get('url')
    const imageFormat = params.get('format')
    if (!sourceImageURL && !AVAILABLE_FORMATS.has(imageFormat)) {
      throw new HTTPError(400)
    }

    const imageURL = new URL(sourceImageURL)
    const httpGet = imageURL.protocol === 'https:' ? https.get : http.get
    const [imageResponse] = await once(httpGet(imageURL), 'response')
    if (imageResponse.statusCode >= 300) {
      throw new HTTPError(imageResponse.statusCode)
    }

    const imageTransformStream = sharp()
    pipeline(imageResponse, imageTransformStream)

    const imageMetaData = await imageTransformStream.clone().metadata()

    const destinationFormat = imageFormat
      ? imageFormat
      : imageResponse.headers['content-type'].split('/')[1]

    response.writeHead(200, {
      'Content-Type': `image/${destinationFormat}`,
      'X-Image-Metadata': JSON.stringify(imageMetaData)
    })

    await pipeline(
      imageTransformStream
        .clone()
        .toFormat(destinationFormat),
      response
    )
  } catch (error) {
    if (response.headersSent) {
      response.end()
    } else {
      const statusCode = error.status ?? error.statusCode ?? 500
      response.statusCode = statusCode
      response.end(error.message ?? http.STATUS_CODES[statusCode])
    }
  }
}

const PORT = process.env.PORT || 3000

http
  .createServer(handler)
  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })