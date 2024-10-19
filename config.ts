import * as path from 'path';

export const Config = {
    build: {
        src: './src',
        concurrencyLimit: 5,
    },

    plugins: {
        ngrok: {
            api_key: process.env.NGROK_API_KEY,
            endpoint: {
                url: process.env.NGROK_ENDPOINT_URL,
            }
        }
    }
}