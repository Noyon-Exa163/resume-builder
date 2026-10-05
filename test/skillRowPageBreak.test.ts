// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { normalizeAndValidate } from "@/lib/schema/normalize";

const root = path.resolve(import.meta.dirname, "..");

describe("skill category rows", () => {
  it("keeps a category label and its chips on the same page", async () => {
    const origReadFile = fs.readFile;
    const origReadFileSync = fs.readFileSync;
    const origPromisesReadFile = fs.promises.readFile;
    const redirect = (filePath: fs.PathLike) => {
      const value = String(filePath);
      return value.startsWith("/skill-icons/") || value.startsWith("/fonts/")
        ? path.join(root, "public", value)
        : filePath;
    };
    const patch = (original: unknown) =>
      function (this: unknown, filePath: fs.PathLike, ...args: unknown[]) {
        return (original as (...call: unknown[]) => unknown).call(
          this,
          redirect(filePath),
          ...args,
        );
      };
    fs.readFile = patch(origReadFile) as unknown as typeof fs.readFile;
    fs.readFileSync = patch(origReadFileSync) as unknown as typeof fs.readFileSync;
    fs.promises.readFile = patch(
      origPromisesReadFile,
    ) as unknown as typeof fs.promises.readFile;

    const { Font, pdf } = await import("@react-pdf/renderer");
    const font = (name: string) => path.join(root, "public/fonts", name);
    // First registration wins for a weight, and the template registers the
    // browser URLs on import — file paths have to be in place before that.
    Font.register({
      family: "Inter",
      fonts: [
        { src: font("Inter-Regular.ttf"), fontWeight: 400 },
        { src: font("Inter-Bold.ttf"), fontWeight: 700 },
      ],
    });
    Font.register({
      family: "Gilroy",
      fonts: [
        { src: font("Gilroy-Regular.ttf"), fontWeight: 400 },
        { src: font("Gilroy-Medium.ttf"), fontWeight: 500 },
        { src: font("Gilroy-Semibold.ttf"), fontWeight: 600 },
        { src: font("Gilroy-Bold.ttf"), fontWeight: 700 },
        { src: font("Gilroy-Black.ttf"), fontWeight: 900 },
      ],
    });

    const { ExabytingDocument } =
      await import("@/templates/exabyting/ExabytingDocument");

    const categories: Array<[string, string[]]> = [
      [
        "Security",
        [
          "GitLab CI/CD",
          "Jenkins",
          "ArgoCD",
          "GitOps",
          "Cloud Migration",
          "Trivy",
          "Falco",
          "OWASP",
          "WAF",
          "TLS/SSL Management",
          "RBAC",
          "Network Policies",
          "Secrets Management",
          "Firewall Configuration",
          "Infrastructure Hardening",
        ],
      ],
      [
        "Kubernetes",
        [
          "Kubernetes",
          "EKS",
          "K3s",
          "Helm Charts",
          "Manifests",
          "Cluster Lifecycle Management",
          "Container Operations",
        ],
      ],
      [
        "Monitoring",
        [
          "Grafana",
          "Prometheus",
          "Loki",
          "CloudWatch",
          "Distributed Tracing",
          "Middleware.io",
          "Sentry",
          "OpenObserve",
        ],
      ],
      [
        "Incident & Docs",
        [
          "Incident Response",
          "Root Cause Analysis",
          "MTTD/MTTR",
          "Blameless Postmortems",
          "Disaster Recovery Runbooks",
          "Operational Documentation",
        ],
      ],
      [
        "Programming",
        [
          "Python",
          "Bash",
          "JavaScript",
          "Java",
          "TypeScript",
          "C",
          "C++",
          "Go (familiar)",
        ],
      ],
      ["Databases", ["PostgreSQL", "MongoDB", "Redis", "MySQL", "SQLite"]],
      ["Tools", ["Git", "GitHub", "GitLab", "Nginx", "Selenium", "Cypress"]],
    ];

    const data = normalizeAndValidate({
      meta: {
        id: "r1",
        title: "Repro",
        templateId: "exabyting",
        pageSize: "A4",
        nameCasing: "uppercase",
      },
      personalInfo: {
        fullName: "Md. Asif Imtiyaz Chowdhury",
        headline: "Site Reliability Engineer",
        email: "asif@example.com",
        phone: "+8801700000000",
        location: "Dhaka, Bangladesh",
      },
      summary:
        "Site reliability engineer focused on Kubernetes platforms, incident response, and the operational documentation that keeps a production estate recoverable.",
      sections: [
        {
          id: "exp",
          kind: "experience",
          title: "Experience",
          layout: "list",
          visible: true,
          entries: Array.from({ length: 3 }, (_, i) => ({
            id: `exp-${i}`,
            title: `Platform Engineer ${i + 1}`,
            subtitle: "Exabyting",
            location: "Dhaka",
            startDate: "2020",
            endDate: "2024",
            bullets: [
              "Owned cluster lifecycle, rollout strategy, and the on-call path for a multi-tenant platform serving internal product teams.",
              "Cut incident recovery time by writing runbooks, tightening alerts, and pairing every page with a blameless review.",
              "Migrated workloads onto Kubernetes with Helm, network policies, and a measured rollout that kept existing traffic intact.",
            ],
          })),
        },
        {
          id: "skills",
          kind: "skills",
          title: "Skills",
          layout: "tags",
          visible: true,
          showSkillIcons: true,
          entries: categories.map(([title, tags], i) => ({
            id: `skill-${i}`,
            title,
            tags,
          })),
        },
        {
          id: "projects",
          kind: "projects",
          title: "Projects",
          layout: "list",
          visible: true,
          entries: [
            {
              id: "proj-1",
              title: "3-Tier Microservice Deployment",
              subtitle: "Docker-based React, Node.js, Golang",
              bullets: [
                "Designed the deployment topology and the rollback path.",
              ],
            },
          ],
        },
      ],
    });

    try {
      const blob = await pdf(
        createElement(ExabytingDocument, { data }) as never,
      ).toBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjs.getDocument({
        data: bytes,
        disableWorker: true,
      } as Parameters<typeof pdfjs.getDocument>[0]).promise;

      const hits: Array<{ page: number; y: number; str: string }> = [];
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const content = await page.getTextContent();
        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          hits.push({
            page: pageNumber,
            y: item.transform[5],
            str: item.str,
          });
        }
      }

      const pageOf = (label: string) => hits.find((hit) => hit.str === label);
      const programming = pageOf("Programming");
      const databases = pageOf("Databases");
      const postgres = pageOf("PostgreSQL");
      const tools = pageOf("Tools");
      const gitHub = pageOf("GitHub");

      expect(programming?.page).toBe(1);
      expect(databases?.page).toBe(2);
      expect(postgres?.page).toBe(databases?.page);
      expect(gitHub?.page).toBe(tools?.page);
      expect(Math.abs((postgres?.y ?? 0) - (databases?.y ?? 0))).toBeLessThan(
        20,
      );
      // Below the top accent bar, inside the page padding.
      expect(postgres?.y ?? 0).toBeLessThan(800);
    } finally {
      fs.readFile = origReadFile;
      fs.readFileSync = origReadFileSync;
      fs.promises.readFile = origPromisesReadFile;
    }
  });
});
