/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { MiniPagination } from "../mini-pagination"

describe("MiniPagination", () => {
  it("renders page info and navigation buttons", () => {
    render(
      <MiniPagination page={0} hasMore={true} onPageChange={() => {}} />
    )

    expect(screen.getByText("Page 1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
  })

  it("disables previous button on first page", () => {
    render(
      <MiniPagination page={0} hasMore={true} onPageChange={() => {}} />
    )

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled()
  })

  it("disables next button when hasMore is false", () => {
    render(
      <MiniPagination page={4} hasMore={false} onPageChange={() => {}} />
    )

    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
  })

  it("calls onPageChange with correct page when clicking buttons", () => {
    const handlePageChange = vi.fn()
    render(
      <MiniPagination page={2} hasMore={true} onPageChange={handlePageChange} />
    )

    fireEvent.click(screen.getByRole("button", { name: /previous/i }))
    expect(handlePageChange).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    expect(handlePageChange).toHaveBeenCalledWith(3)
  })

  it("returns null when on first page with no more results", () => {
    const { container } = render(
      <MiniPagination page={0} hasMore={false} onPageChange={() => {}} />
    )

    expect(container.firstChild).toBeNull()
  })

  it("shows pagination when on page > 0 even with no more results", () => {
    render(
      <MiniPagination page={1} hasMore={false} onPageChange={() => {}} />
    )

    expect(screen.getByText("Page 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
  })
})
