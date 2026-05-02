import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET!
const key = new TextEncoder().encode(secretKey)

export interface JWTPayload {
  id: string
  email: string
  name: string | null
  image: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
  [key: string]: unknown
}

export async function encrypt(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function decrypt(input: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  })
  return payload as unknown as JWTPayload
}
