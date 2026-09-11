import Foundation
import PDFKit
// Usage: swift pdftext.swift <file.pdf>  — prints the PDF's text, page by page.
let path = CommandLine.arguments[1]
guard let doc = PDFDocument(url: URL(fileURLWithPath: path)) else {
    FileHandle.standardError.write("cannot open \(path)\n".data(using: .utf8)!); exit(1)
}
for i in 0..<doc.pageCount {
    if let t = doc.page(at: i)?.string { print(t) }
}
