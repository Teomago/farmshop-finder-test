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

## Email Sending with Brevo (Sendinblue)

To enable email sending (e.g., password reset, notifications) using Brevo, follow these steps:

1. **Add the following variables to your `.env` file:**
   ```env
   BREVO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   BREVO_EMAILS_ACTIVE=true
   BREVO_SENDER_NAME=YourName
   BREVO_SENDER_EMAIL=your@email.com
   ```

2. **Create the Brevo adapter:**
   In `src/utils/brevoAdapter.ts`:
   ```ts
   import axios from 'axios';
   import { EmailAdapter, SendEmailOptions } from 'payload';

   const brevoAdapter = (): EmailAdapter => {
     const adapter = () => ({
       name: 'Brevo',
       defaultFromAddress: process.env.BREVO_SENDER_EMAIL as string,
       defaultFromName: process.env.BREVO_SENDER_NAME as string,
       sendEmail: async (message: SendEmailOptions): Promise<unknown> => {
         if (!process.env.BREVO_EMAILS_ACTIVE) {
           console.log('Emails disabled, logging to console');
           console.log(message);
           return;
         }
         try {
           const res = await axios({
             method: 'post',
             url: 'https://api.brevo.com/v3/smtp/email',
             headers: {
               'api-key': process.env.BREVO_API_KEY as string,
               'Content-Type': 'application/json',
               Accept: 'application/json',
             },
             data: {
               sender: {
                 name: process.env.BREVO_SENDER_NAME as string,
                 email: process.env.BREVO_SENDER_EMAIL as string,
               },
               to: [
                 { email: message.to },
               ],
               subject: message.subject,
               htmlContent: message.html,
             },
           });
           console.log('Email sent successfully');
           return res.data;
         } catch (error) {
           console.error('Error sending email with Brevo:', error);
           throw error;
         }
       },
     });
     return adapter;
   };
   export default brevoAdapter;
   ```

3. **Install axios dependency:**
   ```bash
   pnpm add axios
   ```

4. **Configure Payload to use the adapter:**
   In `src/payload.config.ts`:
   ```ts
   import brevoAdapter from './utils/brevoAdapter';
   // ...
   export default buildConfig({
     // ...
     email: brevoAdapter(),
     // ...
   });
   ```

With this setup, all emails sent by Payload will use your Brevo account. Make sure not to commit your real API keys to version control.

## S3 Storage Setup

To configure S3 storage for media uploads in this project, follow these steps:

1. **Install the S3 Storage Plugin**:
   Ensure the `@payloadcms/storage-s3` package is installed. This is already included in the project dependencies.

2. **Set Up Environment Variables**:
   Add the following variables to your `.env` file:
   ```env
   S3_BUCKET=<your-s3-bucket-name>
   S3_ACCESS_KEY_ID=<your-access-key-id>
   S3_SECRET_ACCESS_KEY=<your-secret-access-key>
   S3_REGION=<your-region>
   S3_ENDPOINT=<optional-custom-endpoint>
   ```

3. **Update Payload Configuration**:
   The `payload.config.ts` file is already configured to use the S3 storage plugin. Ensure the following plugin configuration exists:
   ```typescript
   import { s3Storage } from '@payloadcms/storage-s3';

   s3Storage({
     collections: {
       media: {
         prefix: 'media',
       },
     },
     bucket: process.env.S3_BUCKET,
     config: {
       credentials: {
         accessKeyId: process.env.S3_ACCESS_KEY_ID,
         secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
       },
       region: process.env.S3_REGION,
       endpoint: process.env.S3_ENDPOINT,
       forcePathStyle: true, // Required for some S3-compatible services
     },
   });
   ```

4. **Test the Integration**:
   Upload a media file through the Payload admin panel and verify it appears in your S3 bucket.

## Front-End and Payload Integration

To integrate Payload CMS with the front-end:

1. **Fetch Global Data**:
   Use the `getPayload` function to fetch global data, such as the `header` and `footer` configurations. Example:
   ```typescript
   import { getPayload } from 'payload';
   import config from '@payload-config';

   const payload = await getPayload({ config });
   const header = await payload.findGlobal({ slug: 'header', depth: 1 });
   ```

2. **Pass Data to Components**:
   Pass the fetched data as props to your React components. For example, the `NavbarCP` component:
   ```tsx
   <NavbarCP
     title={header.title}
     logoUrl={header.logo.url}
     logoAlt={header.logo.alt}
     navItems={header.nav.map((item) => ({
       id: item.id,
       label: item.label,
       link: item.link,
     }))}
   />
   ```

3. **Dynamic Rendering**:
   Ensure components like `NavbarCP` and `Footer` dynamically render content based on the data passed from Payload.

4. **Test the Integration**:
   Run the application locally and verify that the header, footer, and other dynamic content are rendered correctly.


