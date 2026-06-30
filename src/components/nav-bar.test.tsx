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
  it("renders primary nav links (Dashboard, Analytics, Categories)", () => {
    render(<NavBar />);

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Analytics").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Categories").length).toBeGreaterThanOrEqual(1);
  });

  it("renders all nav links with correct hrefs", () => {
    render(<NavBar />);

    const dashboardLinks = screen.getAllByText("Dashboard");
    const analyticsLinks = screen.getAllByText("Analytics");

    expect(dashboardLinks[0].closest("a")).toHaveAttribute("href", "/");
    expect(analyticsLinks[0].closest("a")).toHaveAttribute(
      "href",
      "/analytics"
    );
  });

  it("renders Accounts, Income, Templates, Transfers links", () => {
    render(<NavBar />);

    expect(screen.getAllByText("Accounts").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Income").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Templates").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Transfers").length).toBeGreaterThanOrEqual(1);
  });

  it("highlights Dashboard when on root path", () => {
    mockPathname = "/";
    render(<NavBar />);

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");

    expect(dashboardLink?.className).toContain("bg-violet-900/30");
    expect(analyticsLink?.className).not.toContain("bg-violet-900/30");
  });

  it("highlights Analytics when on /analytics path", () => {
    mockPathname = "/analytics";
    render(<NavBar />);

    const dashboardLink = screen.getAllByText("Dashboard")[0].closest("a");
    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");

    expect(dashboardLink?.className).not.toContain("bg-violet-900/30");
    expect(analyticsLink?.className).toContain("bg-violet-900/30");
  });

  it("highlights Analytics for nested analytics paths", () => {
    mockPathname = "/analytics/history";
    render(<NavBar />);

    const analyticsLink = screen.getAllByText("Analytics")[0].closest("a");
    expect(analyticsLink?.className).toContain("bg-violet-900/30");
  });

  it("highlights Categories when on /categories path", () => {
    mockPathname = "/categories";
    render(<NavBar />);

    const categoriesLink = screen
      .getAllByText("Categories")[0]
      .closest("a");
    expect(categoriesLink?.className).toContain("bg-violet-900/30");
  });
});
