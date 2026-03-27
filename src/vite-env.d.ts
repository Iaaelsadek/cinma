/// <reference types="vite/client" />

import 'react';

declare module 'react' {
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    fetchPriority?: 'high' | 'low' | 'auto';
  }
}

// GLSL shader imports
declare module '*.glsl' {
  const content: string
  export default content
}

declare module '*.vert.glsl' {
  const content: string
  export default content
}

declare module '*.frag.glsl' {
  const content: string
  export default content
}
