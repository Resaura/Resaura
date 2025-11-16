+const { writeFileSync } = require('node:fs');
+const { resolve } = require('node:path');
+
+const canonicalConfig = {
+  cli: {
+    requireCommit: false,
+  },
+  build: {
+    preview: {
+      channel: 'preview',
+      developmentClient: true,
+      distribution: 'internal',
+      android: {
+        buildType: 'apk',
+      },
+      ios: {
+        simulator: true,
+      },
+    },
+    production: {
+      channel: 'production',
+      autoIncrement: true,
+      distribution: 'store',
+      android: {
+        buildType: 'app-bundle',
+      },
+      ios: {
+        buildType: 'archive',
+      },
+    },
+  },
+  update: {
+    preview: {
+      channel: 'preview',
+    },
+    production: {
+      channel: 'production',
+    },
+  },
+  submit: {
+    production: {
+      android: {
+        serviceAccountKeyPath: './credentials/android-service-account.json',
+      },
+      ios: {},
+    },
+  },
+};
+
+const target = resolve(process.cwd(), 'eas.json');
+writeFileSync(target, `${JSON.stringify(canonicalConfig, null, 2)}\n`, 'utf8');
+console.log(`Rewrote ${target} with canonical Expo Application Services settings.`);
