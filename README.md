# Payload Blank Template

This template comes configured with the bare minimum to get started on anything you need.

## Quick start

This template can be deployed directly from our Cloud hosting and it will setup MongoDB and cloud S3 object storage for media.

## Quick Start - local setup

To spin up this template locally, follow these steps:

### Clone

After you click the `Deploy` button above, you'll want to have standalone copy of this repo on your machine. If you've already cloned this repo, skip to [Development](#development).

### Development

1. First [clone the repo](#clone) if you have not done so already
2. `cd my-project && cp .env.example .env` to copy the example environment variables. You'll need to add the `MONGODB_URI` from your Cloud project to your `.env` if you want to use S3 storage and the MongoDB database that was created for you.

3. `pnpm install && pnpm dev` to install dependencies and start the dev server
4. open `http://localhost:3000` to open the app in your browser

That's it! Changes made in `./src` will be reflected in your app. Follow the on-screen instructions to login and create your first admin user. Then check out [Production](#production) once you're ready to build and serve your app, and [Deployment](#deployment) when you're ready to go live.

#### Docker (Optional)

If you prefer to use Docker for local development instead of a local MongoDB instance, the provided docker-compose.yml file can be used.

To do so, follow these steps:

- Modify the `MONGODB_URI` in your `.env` file to `mongodb://127.0.0.1/<dbname>`
- Modify the `docker-compose.yml` file's `MONGODB_URI` to match the above `<dbname>`
- Run `docker-compose up` to start the database, optionally pass `-d` to run in the background.

## How it works

The Payload config is tailored specifically to the needs of most websites. It is pre-configured in the following ways:

### Collections

See the [Collections](https://payloadcms.com/docs/configuration/collections) docs for details on how to extend this functionality.

- #### Users (Authentication)

  Users are auth-enabled collections that have access to the admin panel.

  For additional help, see the official [Auth Example](https://github.com/payloadcms/payload/tree/main/examples/auth) or the [Authentication](https://payloadcms.com/docs/authentication/overview#authentication-overview) docs.

- #### Media

  This is the uploads enabled collection. It features pre-configured sizes, focal point and manual resizing to help you manage your pictures.

### Docker

Alternatively, you can use [Docker](https://www.docker.com) to spin up this template locally. To do so, follow these steps:

1. Follow [steps 1 and 2 from above](#development), the docker-compose file will automatically use the `.env` file in your project root
1. Next run `docker-compose up`
1. Follow [steps 4 and 5 from above](#development) to login and create your first admin user

That's it! The Docker instance will help you get up and running quickly while also standardizing the development environment across your teams.

## Questions

If you have any issues or questions, reach out to us on [Discord](https://discord.com/invite/payload) or start a [GitHub discussion](https://github.com/payloadcms/payload/discussions).

## TailwindCSS Setup with Payload

To set up TailwindCSS in this project with Payload, follow these steps:

1. **Install dependencies**:
   Run the following command to install the required dependencies:
   ```bash
   pnpm install tailwindcss @tailwindcss/postcss postcss
   ```

2. **Approve builds**:
   Approve `@tailwindcss/oxide` by running:
   ```bash
   pnpm approve-builds
   ```

3. **Generate import map**:
   Generate the import map with the following command:
   ```bash
   pnpm payload generate:importmap
   ```

4. **PostCSS configuration**:
   Create a `postcss.config.mjs` file in the project root with the following content:
   ```javascript
   const config = {
     plugins: {
       '@tailwindcss/postcss': {},
     },
   };
   export default config;
   ```

5. **Import TailwindCSS**:
   Add the following line to the `styles.css` file located in the `(frontend)` folder:
   ```css
   @import "tailwindcss";
   ```

6. **Test styles**:
   Verify that TailwindCSS is working correctly by adding the following code in `page.tsx`:
   ```tsx
   <div className="bg-gray-700 font-mono p-8 rounded-lg shadow-xl shadow-zinc-800">
     <h1 className="w-fit font-bold size-16">Test title</h1>
     <p>
       Lorem ipsum dolor sit amet consectetur adipisicing elit. Quaerat excepturi reiciendis nisi
       explicabo provident vitae amet blanditiis autem quo. Recusandae inventore eius optio
       laborum quis quam voluptas nesciunt, deleniti soluta.
     </p>
   </div>
   ```

With these steps, TailwindCSS should be correctly set up in your Payload project.

## HeroUI Integration with TailwindCSS and Next.js

Below are the steps taken to integrate HeroUI and TailwindCSS in the project's frontend, along with best practices for using client/server components in Next.js:

1. **Install HeroUI and required dependencies**:
   ```bash
   pnpm install @heroui/react framer-motion
   pnpm approve-builds # To approve HeroUI scripts
   ```

2. **.npmrc configuration**:
   Add the following line to ensure proper HeroUI installation:
   ```properties
   public-hoist-pattern[]=@heroui/*
   ```

3. **Update and sync dependencies**:
   - Run `pnpm install` to reinstall dependencies.
   - Update HeroUI to the latest version:
     ```bash
     npx heroui-cli@latest upgrade --all
     ```
   - Run `pnpm install` again to ensure compatibility.
   - Update `react-dom` and other dependencies if needed.

4. **HeroUI configuration**:
   - Create the `hero.ts` file in the `(frontend)` folder with:
     ```ts
     import { heroui } from '@heroui/react';
     export default heroui();
     ```

5. **Integration in the styles file**:
   - In `styles.css` add:
     ```css
     @import 'tailwindcss';
     @plugin './hero.ts';
     @source '../../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}';
     @custom-variant dark (&:is(.dark *));
     ```
   - Change the language mode of the file to Tailwind CSS in VS Code to avoid syntax errors.

6. **Global HeroUI Provider**:
   - Create the `providers.tsx` file in `(frontend)`:
     ```tsx
     'use client';
     import { HeroUIProvider } from '@heroui/react';
     export function Providers({ children }: { children: React.ReactNode }) {
       return <HeroUIProvider>{children}</HeroUIProvider>;
     }
     ```
   - Modify the `layout.tsx` file to wrap the content with `<Providers>` inside `<body>`.

7. **Best practices for client/server components in Next.js**:
   - Create a `components/` folder for reusable components.
   - Components using HeroUI or requiring `'use client'` should be in separate files and start with `'use client'`.
   - Keep components/pages using async logic or `'use server'` separate.
   - Import and use HeroUI components only in client-side files.

> **Note:** This separation is essential to avoid rendering errors and ensure proper functioning of HeroUI and other interactive components in Next.js App Router.


