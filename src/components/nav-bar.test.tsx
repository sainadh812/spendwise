import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NavBar } from "@/components/nav-bar";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

afterEach(() => {
  cleanup();
  mockPathname = "/";
});

describe("NavBar", () => {
  it("renders Dashboard and Analytics links", () => {
    render(<NavBar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("renders links with correct hrefs", () => {
    render(<NavBar />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const analyticsLink = screen.getByText("Analytics").closest("a");

    expect(dashboardLink).toHaveAttribute("href", "/");
    expect(analyticsLink).toHaveAttribute("href", "/analytics");
  });

  it("highlights Dashboard when on root path", () => {
    mockPathname = "/";
    render(<NavBar />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const analyticsLink = screen.getByText("Analytics").closest("a");

    expect(dashboardLink?.className).toContain("bg-primary");
    expect(analyticsLink?.className).not.toContain("bg-primary");
  });

  it("highlights Analytics when on /analytics path", () => {
    mockPathname = "/analytics";
    render(<NavBar />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const analyticsLink = screen.getByText("Analytics").closest("a");

    expect(dashboardLink?.className).not.toContain("bg-primary");
    expect(analyticsLink?.className).toContain("bg-primary");
  });

  it("highlights Analytics for nested analytics paths", () => {
    mockPathname = "/analytics?view=yearly&year=2025";
    render(<NavBar />);

    const analyticsLink = screen.getByText("Analytics").closest("a");
    expect(analyticsLink?.className).toContain("bg-primary");
  });
});
