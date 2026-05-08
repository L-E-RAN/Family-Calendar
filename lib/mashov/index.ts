export * from './types'
export * from './mapper'
export { MockMashovAdapter } from './mock-adapter'
export { RealMashovAdapter } from './real-adapter'

export function getMashovAdapter() {
  const { RealMashovAdapter } = require('./real-adapter')
  return new RealMashovAdapter()
}
