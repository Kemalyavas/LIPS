import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PostEnginePage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Post Engine</h2>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 mb-4">
            The Post Engine will generate original LinkedIn posts using a two-stage process:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-600">
            <li>
              <strong>Structure</strong> — SFC MCP server generates a well-structured draft
              based on proven LinkedIn frameworks
            </li>
            <li>
              <strong>Voice</strong> — Claude rewrites the draft in Daniel&apos;s authentic voice
              using the Style Knowledge Base
            </li>
          </ol>
          <p className="text-sm text-zinc-500 mt-4">
            Waiting for MCP server credentials to enable this feature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
