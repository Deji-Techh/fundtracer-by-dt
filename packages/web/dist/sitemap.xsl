<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>FundTracer Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
          }
          h1 {
            color: #10b981;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th {
            background: #10b981;
            color: white;
            text-align: left;
            padding: 12px 15px;
          }
          td {
            padding: 10px 15px;
            border-bottom: 1px solid #eee;
          }
          tr:hover {
            background: #f9f9f9;
          }
          a {
            color: #10b981;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .priority-high { color: #10b981; font-weight: bold; }
          .priority-medium { color: #f59e0b; }
          .priority-low { color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>FundTracer Sitemap</h1>
        <p>This XML Sitemap contains <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs</p>
        <table>
          <tr>
            <th>URL</th>
            <th>Priority</th>
            <th>Change Frequency</th>
          </tr>
          <xsl:for-each select="sitemap:urlset/sitemap:url">
            <xsl:sort select="sitemap:priority" order="descending"/>
            <tr>
              <td>
                <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
              </td>
              <td>
                <xsl:attribute name="class">
                  <xsl:choose>
                    <xsl:when test="sitemap:priority >= 0.8">priority-high</xsl:when>
                    <xsl:when test="sitemap:priority >= 0.5">priority-medium</xsl:when>
                    <xsl:otherwise>priority-low</xsl:otherwise>
                  </xsl:choose>
                </xsl:attribute>
                <xsl:value-of select="sitemap:priority"/>
              </td>
              <td><xsl:value-of select="sitemap:changefreq"/></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
