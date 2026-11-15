import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:'/V2/kiwi-widget/',plugins:[react()],build:{outDir:'../../kiwi-widget',emptyOutDir:true,target:'es2022'},resolve:{dedupe:['react','react-dom']}});
