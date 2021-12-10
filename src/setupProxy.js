const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function(app) {
  console.log('setupProxy...')
  app.use(createProxyMiddleware('/flashbots-relay-goerli', {
    target: 'https://relay-goerli.flashbots.net',
    changeOrigin: true 
  }))
}

// export default function(app) {
//   app.use('/flashbots-relay-goerli', createProxyMiddleware({
//     target: 'https://relay-goerli.flashbots.net',
//     changeOrigin: true 
//   }))
// }