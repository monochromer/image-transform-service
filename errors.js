import http from 'node:http'

export class CustomError extends Error {
  constructor(message) {
    super(message)

    Error.captureStackTrace
      ? Error.captureStackTrace(this, this.constructor)
      : (this.stack = (new Error()).stack)
  }

  get name() {
    return this.constructor.name
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message
    }
  }
}

export class HTTPError extends CustomError {
  constructor(status, message = http.STATUS_CODES[status] ?? http.STATUS_CODES[500]) {
    super(message)
    this.status = status
  }

  get statusCode() {
    return this.status
  }

  toJSON() {
    return {
      name: this.name,
      statusCode: this.status,
      message: this.message
    }
  }
}