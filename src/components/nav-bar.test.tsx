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
  it("renders Dashboard, Analytics, Categories and Import links", () => {
    render(<NavBar />);

    const dashboardLinks = screen.getAllByText("Dashboard");
    const analyticsLinks = screen.getAllByText("Analytics");
    const categoriesLinks = screen.getAllByText("Categories");
    const importLinks = screen.getAllByText("Import");

    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    expect(analyticsLinks.length).toBeGreaterThanOrEqual(1);
    expect(categoriesLinks.length).toBeGreaterThanOrEqual(1);
    expect(importLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders desktop links with correct hrefs", () => {
    render(<NavBar />);

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");
    const categoriesLink = screen.getAllByText("Categories")[0].closest("a");

    expect(dashboardLink).toHaveAttribute("href", "/");
    expect(analyticsLink).toHaveAttribute("href", "/analytics");
    expect(categoriesLink).toHaveAttribute("href", "/categories");
  });

  it("highlights Dashboard when on root path", () => {
    mockPathname = "/";
    render(<NavBar />);

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");

    expect(dashboardLink?.className).toContain("bg-primary");
    expect(analyticsLink?.className).not.toContain("bg-primary");
  });

  it("highlights Analytics when on /analytics path", () => {
    mockPathname = "/analytics";
    render(<NavBar />);

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");

    expect(dashboardLink?.className).not.toContain("bg-primary");
    expect(analyticsLink?.className).toContain("bg-primary");
  });

  it("highlights Analytics for nested analytics paths", () => {
    mockPathname = "/analytics/history";
    render(<NavBar />);

    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");
    expect(analyticsLink?.className).toContain("bg-primary");
  });

  it("highlights Categories for nested category paths", () => {
    mockPathname = "/categories/manage";
    render(<NavBar />);

    const categoriesLink = screen.getAllByText("Categories")[0].closest("a");
    expect(categoriesLink?.className).toContain("bg-primary");
  });

  it("renders a mobile menu button", () => {
    render(<NavBar />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });
});
