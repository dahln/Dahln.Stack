namespace Dahln.Stack.Dto
{
    public class Search
    {
        public Search()
        {
            SortDirection = Dahln.Stack.Dto.SortDirection.Ascending;
        }
        public string? FilterText { get; set; }
        public int Page { get; set; } = 0;
        public int PageSize { get; set; } = 15;
        public string? SortBy { get; set; }
        public SortDirection? SortDirection { get; set; }

    }

    public enum SortDirection
    {
        Descending = -1,
        Ascending = 1
    }

    public class SearchResponse<T>
    {
        public List<T> Results { get; set; } = new List<T>();
        public int Total { get; set; }
    }
}




