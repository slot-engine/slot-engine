export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // escapes "<" so a string in the data cannot close the script tag
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
