module.exports = {
    apps: [
      {
        name: 'my-next-app',
        script: 'node_modules/.bin/next',
        args: 'start',
        instances: '1', // Use the maximum number of instances based on the number of CPU cores
        exec_mode: 'cluster', // Enable cluster mode
        watch: false, // Set to true if you want to watch for file changes
        env: {
          NODE_ENV: 'production',
        },
      },
    ],
  };
  