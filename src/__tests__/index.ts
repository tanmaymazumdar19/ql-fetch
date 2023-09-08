import qlfetch from '..'

const jsonRes = {
  id: 1,
  title: 'iPhone 9',
  description: 'An apple mobile which is nothing like apple',
  price: 549,
  discountPercentage: 12.96,
  rating: 4.69,
  stock: 94,
  brand: 'Apple',
  category: 'smartphones',
  thumbnail: 'https://i.dummyjson.com/data/products/1/thumbnail.jpg',
  images: [
    'https://i.dummyjson.com/data/products/1/1.jpg',
    'https://i.dummyjson.com/data/products/1/2.jpg',
    'https://i.dummyjson.com/data/products/1/3.jpg',
    'https://i.dummyjson.com/data/products/1/4.jpg',
    'https://i.dummyjson.com/data/products/1/thumbnail.jpg',
  ],
}

describe('qlfetch', () => {
  describe('basic functionality', () => {
    it('should return text and a 200 status for a simple GET request', async () => {
      const req = qlfetch('https://dummyjson.com/carts')
      const res = await req
      expect(res).toBeInstanceOf(Object)
      expect(res.status).toEqual(200)
    })

    it('should return a rejected promise for 404 responses', async () => {
      const req = qlfetch('https://dummyjson.com/http/404')
      const returnsTrue = jest.fn(d => d)
      const res = await req.catch(returnsTrue)
      expect(res).toBeInstanceOf(Object)
      expect(res.status).toEqual(404)
    })
  })

  describe('options.responseType', () => {
    it('should parse responses as JSON by default', async () => {
      const res = await qlfetch.get('https://dummyjson.com/products/1')
      expect(res.data).toEqual(jsonRes)
    })

    it('should force JSON for responseType:json', async () => {
      const res = await qlfetch.get('https://dummyjson.com/products/1', {
        responseType: 'json',
      })
      expect(res.data).toEqual(jsonRes)
    })

    it('should still parse JSON when responseType:text', async () => {
      // this is just how axios works
      const res = await qlfetch.get('https://dummyjson.com/products/1', {
        responseType: 'text',
      })
      expect(res.data).toEqual(jsonRes)
    })
  })

  describe('options.baseURL', () => {
    it('should resolve URLs relative to baseURL if provided', async () => {
      const fetchInstance = qlfetch.create({
        baseURL: 'https://dummyjson.com',
      })
      const res = await fetchInstance('/carts')
      expect(res.url).toBe('https://dummyjson.com/carts')
      expect(res.status).toEqual(200)
    })

    it('should resolve baseURL for relative URIs', async () => {
      try {
        const res = await qlfetch.get('/carts', {
          baseURL: 'https://dummyjson.com',
        })
        expect(res.url).toBe('https://dummyjson.com/carts')
        expect(res.status).toEqual(200)
      } finally {
        // window.fetch = oldFetch
      }
    })
  })

  describe('static helpers', () => {
    it('#all should work', async () => {
      const result = await qlfetch.all([Promise.resolve('hello'), Promise.resolve('world')])

      expect(result).toEqual(['hello', 'world'])
    })

    it('#spread should work', async () => {
      const result = await qlfetch.all([Promise.resolve('hello'), Promise.resolve('world')]).then(
        qlfetch.spread((item1: any, item2: any) => {
          return `${item1} ${item2}`
        }),
      )

      expect(result).toEqual('hello world')
    })
  })
})
