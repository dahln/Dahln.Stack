using Dahln.Stack.Database;
using Microsoft.EntityFrameworkCore;

namespace Dahln.Stack.Service;

public class CustomerService
{
    private ApplicationDbContext _db { get; }
    public CustomerService(ApplicationDbContext applicationDbContext)
    {
        _db = applicationDbContext;
    }

    public async Task<string> CreateCustomerAsync(Dto.Customer model, string userId)
    {
        Database.Customer customer = new Database.Customer()
        {
            Name = model.Name,
            Email = model.Email,
            Phone = model.Phone,
            BirthDate = model.BirthDate,
            Address = model.Address,
            City = model.City,
            State = model.State,
            Postal = model.Postal,
            Notes = model.Notes,
            ImageBase64 = model.ImageBase64,
            Active = model.Active,
            Gender = model.Gender,
            OwnerId = userId
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        return customer.Id;
    }

    public async Task<Dto.Customer?> GetCustomerAsync(string customerId, string userId)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == customerId && c.OwnerId == userId);

        if(customer == null)
            return null;

        var response = new Dto.Customer()
        {
            Id = customer.Id,
            Name = customer.Name,
            Email = customer.Email,
            Phone = customer.Phone,
            BirthDate = customer.BirthDate,
            Address = customer.Address,
            City = customer.City,
            State = customer.State,
            Postal = customer.Postal,
            Notes = customer.Notes,
            ImageBase64 = customer.ImageBase64,
            Active = customer.Active,
        };

        return response;
    }

    public async Task<bool> UpdateCustomer(Dto.Customer model, string userId)
    {
        var customer = _db.Customers.FirstOrDefault(c => c.Id == model.Id && c.OwnerId == userId);
        
        if (customer == null)
            return false;

        customer.Name = model.Name;
        customer.Email = model.Email;
        customer.Phone = model.Phone;
        customer.BirthDate = model.BirthDate;
        customer.Address = model.Address;
        customer.City = model.City;
        customer.State = model.State;
        customer.Postal = model.Postal;
        customer.Notes = model.Notes;
        customer.ImageBase64 = model.ImageBase64;
        customer.Active = model.Active;
        customer.Gender = model.Gender;
        customer.UpdateOn = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteCustomerByIdAsync(string customerId, string userId)
    {
        var customer = _db.Customers.FirstOrDefault(c => c.Id == customerId && c.OwnerId == userId);
        if (customer == null)
            return false;

        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<Dto.SearchResponse<Dto.Customer>> SearchCustomersAsync(Dto.Search search, string userId)
    {
        var query = _db.Customers.Where(c => c.OwnerId == userId);

        if (!string.IsNullOrEmpty(search.FilterText))
        {
            query = query.Where(i => i.Name.ToLower().Contains(search.FilterText.ToLower()) ||
                                    i.Email.ToLower().ToLower().Contains(search.FilterText.ToLower()) ||
                                    i.Phone.ToLower().Contains(search.FilterText.ToLower()) ||
                                    i.Address.ToLower().Contains(search.FilterText.ToLower()) ||
                                    i.State.ToLower().Contains(search.FilterText.ToLower()) ||
                                    i.Postal.ToLower().Contains(search.FilterText.ToLower()) ||
                                    i.Notes.ToLower().Contains(search.FilterText.ToLower()));
        }

        if (search.SortBy == nameof(Dto.Customer.Name))
        {
            query = search.SortDirection == Dto.SortDirection.Ascending
                        ? query.OrderBy(c => c.Name)
                        : query.OrderByDescending(c => c.Name);
        }
        else if (search.SortBy == nameof(Dto.Customer.State))
        {
            query = search.SortDirection == Dto.SortDirection.Ascending
                        ? query.OrderBy(c => c.State)
                        : query.OrderByDescending(c => c.State);
        }
        else if (search.SortBy == nameof(Dto.Customer.Gender))
        {
            query = search.SortDirection == Dto.SortDirection.Ascending
                        ? query.OrderBy(c => c.Gender)
                        : query.OrderByDescending(c => c.Gender);
        }
        else if (search.SortBy == nameof(Dto.Customer.Active))
        {
            query = search.SortDirection == Dto.SortDirection.Ascending
                        ? query.OrderBy(c => c.Active)
                        : query.OrderByDescending(c => c.Active);
        }
        else
        {
            query = search.SortDirection == Dto.SortDirection.Ascending
                        ? query.OrderBy(c => c.Name)
                        : query.OrderByDescending(c => c.Name);
        }

        Dto.SearchResponse<Dto.Customer> response = new Dto.SearchResponse<Dto.Customer>();
        response.Total = await query.CountAsync();

        var dataResponse = await query.Skip(search.Page * search.PageSize)
                                    .Take(search.PageSize)
                                    .ToListAsync();

        response.Results = dataResponse.Select(c => new Dto.Customer()
        {
            Id = c.Id,
            Name = c.Name,
            City = c.City,
            State = c.State,
            Postal = c.Postal,
            Gender = c.Gender,
            Active = c.Active,
        }).ToList();

        return response;
    }

    public async Task SeedCustomers(int number, string userId)
    {
        for (int a = 0; a < number; a++)
        {
            var customer = new Database.Customer()
            {
                Name = LoremNET.Lorem.Words(2),
                Gender = (Dto.Gender)LoremNET.Lorem.Enum<Dto.Gender>(),
                Email = LoremNET.Lorem.Email(),
                Phone = LoremNET.Lorem.HexNumber(10),
                Address = $"{LoremNET.Lorem.HexNumber(5).ToString()} {LoremNET.Lorem.Words(1)}",
                City = LoremNET.Lorem.Words(1),
                State = LoremNET.Lorem.Words(1),
                Postal = LoremNET.Lorem.HexNumber(5),
                BirthDate = LoremNET.Lorem.DateTime(1923, 1, 1),
                Notes = LoremNET.Lorem.Paragraph(5, 10, 10),
                Active = true,
                OwnerId = userId
            };

            _db.Customers.Add(customer);
            await _db.SaveChangesAsync();
        }
    }
}

