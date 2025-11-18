module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // HMR-Endlosschleife beheben - nur in Development
      if (process.env.NODE_ENV === 'development') {
        // Webpack HMR-Einstellungen optimieren
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          // Verhindert unnötige Hash-Änderungen bei jedem Update
          // 'deterministic' sorgt für stabile Hashes, die sich nur bei echten Änderungen ändern
          moduleIds: 'deterministic',
          chunkIds: 'deterministic',
        };
        
        // HMR-Update-Konfiguration optimieren
        if (webpackConfig.devServer) {
          webpackConfig.devServer.hot = true;
          // Live Reload deaktivieren (nur HMR verwenden)
          // Live Reload kann zusätzliche Probleme verursachen
          webpackConfig.devServer.liveReload = false;
        }
      }
      return webpackConfig;
    },
  },
};

