'use strict'
import app from '../app'
import dotenv from 'dotenv'
import * as project from '../utils/project'

jest.mock('../utils/project')
const mockedProject = project as jest.Mocked<typeof project>

dotenv.config({ path: '.env.test' })

const ENV = process.env

beforeEach(() => {
  process.env = { ...ENV }
  process.env.X_FORWARDED_HOST_REGEXP = '^([a-z]{20})\\.supabase\\.(?:co|in|net)$'
})

describe('with X-Forwarded-Host header', () => {
  test('PostgREST URL is constructed using X-Forwarded-Host if regexp matches', async () => {
    mockedProject.getAnonKey.mockResolvedValue('abc')
    const response = await app().inject({
      method: 'GET',
      url: `/bucket`,
      headers: {
        authorization: `Bearer ${process.env.AUTHENTICATED_KEY}`,
        'x-forwarded-host': 'abcdefghijklmnopqrst.supabase.co',
      },
    })
    expect(mockedProject.getAnonKey).toHaveBeenCalledWith('abcdefghijklmnopqrst')
    expect(response.statusCode).toBe(500)
    const responseJSON = JSON.parse(response.body)
    expect(responseJSON.message).toContain('http://abcdefghijklmnopqrst.supabase.co/rest/v1')
  })

  test('Error is thrown if X-Forwarded-Host is not present', async () => {
    const response = await app().inject({
      method: 'GET',
      url: `/bucket`,
      headers: {
        authorization: `Bearer ${process.env.AUTHENTICATED_KEY}`,
      },
    })
    expect(response.statusCode).toBe(500)
    const responseJSON = JSON.parse(response.body)
    expect(responseJSON.message).toBe('X-Forwarded-Host header is not a string')
  })

  test('Error is thrown if X-Forwarded-Host does not match regexp', async () => {
    const response = await app().inject({
      method: 'GET',
      url: `/bucket`,
      headers: {
        authorization: `Bearer ${process.env.AUTHENTICATED_KEY}`,
        'x-forwarded-host': 'abcdefghijklmnopqrst.supabase.com',
      },
    })
    expect(response.statusCode).toBe(500)
    const responseJSON = JSON.parse(response.body)
    expect(responseJSON.message).toBe('X-Forwarded-Host header does not match regular expression')
  })
})
