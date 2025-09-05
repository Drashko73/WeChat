/**
 * Pagination response DTO for paginated results
 */
class PaginatedResponseDto {
  constructor(data, page, limit, total) {
    this.data = data;
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrevious = page > 1;
  }
}

module.exports = PaginatedResponseDto;
