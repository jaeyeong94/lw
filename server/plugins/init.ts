import '~/server/lib/pg';

const config = useRuntimeConfig();

export default defineNitroPlugin(async (nitroApp) => {
  console.log('NODE_ENV', process.env.NODE_ENV);
  console.log('Database Name', config.DATABASE_NAME);
  console.log('Database plugin loaded');
});
