package targetcheck

import (
	"regexp"
	"strings"
)

// cloudService labels a well-known cloud endpoint hostname so the wizard can
// show what the user entered (e.g. "AWS S3 bucket").
//
// storage marks object stores that answer on a shared frontend: every
// "<anything>.s3.amazonaws.com" resolves and accepts a connection, so DNS and
// TCP prove nothing there and only the HTTP response distinguishes a real
// bucket from a typo.
type cloudService struct {
	match    *regexp.Regexp
	provider string
	label    string
	storage  bool
}

var cloudServices = []cloudService{
	// AWS: bucket.s3.amazonaws.com, bucket.s3.us-east-1.amazonaws.com,
	// bucket.s3-website-us-east-1.amazonaws.com, s3.amazonaws.com, …
	{regexp.MustCompile(`(^|\.)s3([.-][a-z0-9-]+)*\.amazonaws\.com(\.cn)?$`), "aws", "AWS S3 bucket", true},
	{regexp.MustCompile(`\.cloudfront\.net$`), "aws", "AWS CloudFront distribution", false},
	{regexp.MustCompile(`\.execute-api\.[a-z0-9-]+\.amazonaws\.com$`), "aws", "AWS API Gateway", false},
	{regexp.MustCompile(`\.elb\.amazonaws\.com$`), "aws", "AWS load balancer", false},
	{regexp.MustCompile(`\.lambda-url\.[a-z0-9-]+\.on\.aws$`), "aws", "AWS Lambda function URL", false},
	{regexp.MustCompile(`\.(awsapprunner\.com|amplifyapp\.com)$`), "aws", "AWS-hosted app", false},
	{regexp.MustCompile(`(^|\.)amazonaws\.com(\.cn)?$`), "aws", "AWS endpoint", false},

	{regexp.MustCompile(`\.(blob|file|queue|table|dfs)\.core\.windows\.net$`), "azure", "Azure Storage account", false},
	{regexp.MustCompile(`\.web\.core\.windows\.net$`), "azure", "Azure static website", false},
	{regexp.MustCompile(`\.azurewebsites\.net$`), "azure", "Azure App Service", false},
	{regexp.MustCompile(`\.azure-api\.net$`), "azure", "Azure API Management", false},
	{regexp.MustCompile(`\.(azureedge\.net|azurefd\.net)$`), "azure", "Azure CDN / Front Door", false},
	{regexp.MustCompile(`\.azurestaticapps\.net$`), "azure", "Azure Static Web App", false},
	{regexp.MustCompile(`\.(cloudapp\.azure\.com|cloudapp\.net)$`), "azure", "Azure cloud service", false},
	{regexp.MustCompile(`\.database\.windows\.net$`), "azure", "Azure SQL server", false},
	{regexp.MustCompile(`\.vault\.azure\.net$`), "azure", "Azure Key Vault", false},
	{regexp.MustCompile(`\.azurecr\.io$`), "azure", "Azure Container Registry", false},

	{regexp.MustCompile(`(^|\.)storage\.googleapis\.com$`), "gcp", "Google Cloud Storage bucket", true},
	{regexp.MustCompile(`\.appspot\.com$`), "gcp", "Google App Engine app", false},
	{regexp.MustCompile(`\.run\.app$`), "gcp", "Google Cloud Run service", false},
	{regexp.MustCompile(`\.cloudfunctions\.net$`), "gcp", "Google Cloud Function", false},
	{regexp.MustCompile(`\.(firebaseio\.com|firebaseapp\.com|web\.app)$`), "gcp", "Firebase app", false},
	{regexp.MustCompile(`(^|\.)googleapis\.com$`), "gcp", "Google API endpoint", false},

	{regexp.MustCompile(`\.digitaloceanspaces\.com$`), "digitalocean", "DigitalOcean Space", true},
	{regexp.MustCompile(`\.ondigitalocean\.app$`), "digitalocean", "DigitalOcean app", false},
}

// isNoSuchBucket reports whether an object-store response body says the bucket
// does not exist. S3, GCS and S3-compatible APIs all use this error code.
func isNoSuchBucket(body []byte) bool {
	return strings.Contains(string(body), "<Code>NoSuchBucket</Code>")
}

// recognizeCloud returns the matching cloud service for host, if any.
func recognizeCloud(host string) (cloudService, bool) {
	host = strings.ToLower(host)
	for _, s := range cloudServices {
		if s.match.MatchString(host) {
			return s, true
		}
	}
	return cloudService{}, false
}
