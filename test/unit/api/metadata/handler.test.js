'use strict'

const Test = require('tapes')(require('tape'))
const Config = require('../../../../src/lib/config')
const Handler = require('../../../../src/api/metadata/handler')
const apiTags = ['api']

function createRequest (routes) {
  let value = routes || []
  return {
    server: {
      table: () => {
        return value
      }
    }
  }
}

Test('metadata handler', (handlerTest) => {
  let originalScale
  let originalPrecision
  let originalHostName

  handlerTest.beforeEach(t => {
    originalScale = Config.AMOUNT.SCALE
    originalPrecision = Config.AMOUNT.PRECISION
    originalHostName = Config.HOSTNAME
    Config.AMOUNT.SCALE = 0
    Config.AMOUNT.PRECISION = 0
    Config.HOSTNAME = ''
    t.end()
  })

  handlerTest.afterEach(t => {
    Config.AMOUNT.SCALE = originalScale
    Config.AMOUNT.PRECISION = originalPrecision
    Config.HOSTNAME = originalHostName
    t.end()
  })

  handlerTest.test('health should', (healthTest) => {
    healthTest.test('return status ok', async function (assert) {
      let reply = {
        response: (response) => {
          assert.equal(response.status, 'OK')
          return {
            code: (statusCode) => {
              assert.equal(statusCode, 200)
              assert.end()
            }
          }
        }
      }

      Handler.health(createRequest(), reply)
    })
    healthTest.end()
  })

  handlerTest.test('metadata should', function (metadataTest) {
    metadataTest.test('return 200 httpStatus', async function (t) {
      let reply = {
        response: () => {
          return {
            code: statusCode => {
              t.equal(statusCode, 200)
              t.end()
            }
          }
        }
      }
      await Handler.metadata(createRequest(), reply)
    })

    metadataTest.test('return urls from request.server and append hostname', t => {
      let hostName = 'some-host-name'
      Config.HOSTNAME = hostName
      let request = createRequest([
        { settings: { id: 'first_route', tags: apiTags }, path: '/first' }
      ])

      let reply = {
        response: (response) => {
          t.equal(response.urls['first_route'], `${hostName}/first`)
          return { code: statusCode => { t.end() } }
        }
      }
      Handler.metadata(request, reply)
    })

    metadataTest.test('format url parameters with colons', t => {
      let request = createRequest([
        { settings: { id: 'path', tags: apiTags }, path: '/somepath/{id}' },
        { settings: { id: 'manyargs', tags: apiTags }, path: '/somepath/{id}/{path*}/{test2}/' }
      ])

      let reply = {
        response: (response) => {
          t.equal(response.urls['path'], '/somepath/:id')
          t.equal(response.urls['manyargs'], '/somepath/:id/:path*/:test2/')
          return { code: () => { t.end() } }
        }
      }

      Handler.metadata(request, reply)
    })

    metadataTest.end()
  })

  handlerTest.end()
})
