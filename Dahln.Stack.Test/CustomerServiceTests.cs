using Dahln.Stack.Database;
using Dahln.Stack.Service;
using Dahln.Stack.Dto;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.InMemory;
using System.Threading.Tasks;
using System;
using System.Linq;
using Microsoft.AspNetCore.Identity;
using Moq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Dahln.Stack.Test;

[TestClass]
public class CustomerServiceTests
{
    private ApplicationDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private CustomerService GetCustomerService(ApplicationDbContext db)
    {
        return new CustomerService(db);
    }


    [TestMethod]
    public async Task AddCustomerAndGetCustomerById()
    {
        var db = GetInMemoryDbContext();
        var service = GetCustomerService(db);
        var userId = "user1";

        //Test Create
        var customer = new Dahln.Stack.Dto.Customer { Name = "Test Customer", Email = "test@example.com" };
        var customerId = await service.CreateCustomerAsync(customer, userId);
        Assert.IsNotNull(customerId);

        //Test Get
        var result = await service.GetCustomerAsync(customerId, userId);
        Assert.IsNotNull(result);
        Assert.AreEqual("Test Customer", result.Name);
    }

    [TestMethod]
    public async Task UpdateCustomer()
    {
        var db = GetInMemoryDbContext();
        var service = GetCustomerService(db);
        var userId = "user1";
        var customer = new Dahln.Stack.Dto.Customer { Name = "Old Name", Email = "old@example.com" };
       
       //Test Create
        var customerId = await service.CreateCustomerAsync(customer, userId);
        var added = await service.GetCustomerAsync(customerId, userId);
        Assert.IsNotNull(added);
        
        //Update Customer
        added.Name = "New Name";
        var updatedResult = await service.UpdateCustomer(added, userId);
        Assert.IsTrue(updatedResult);
        
        //Get Customer and validate update
        var updated = await service.GetCustomerAsync(customerId, userId);
        Assert.IsNotNull(updated);
        Assert.AreEqual("New Name", updated.Name);
    }


    [TestMethod]
    public async Task DeleteCustomer()
    {
        var db = GetInMemoryDbContext();
        var service = GetCustomerService(db);
        var userId = "user1";
        
        var customer = new Dahln.Stack.Dto.Customer { Name = "To Delete", Email = "delete@example.com" };
        
        //Test Create and Delete new customer
        var customerId = await service.CreateCustomerAsync(customer, userId);
        var deleted = await service.DeleteCustomerByIdAsync(customerId, userId);
        Assert.IsTrue(deleted);

        //Try to get deleted customer - should be null
        var result = await service.GetCustomerAsync(customerId, userId);
        Assert.IsNull(result);
    }

    [TestMethod]
    public async Task SearchCustomers()
    {
        var db = GetInMemoryDbContext();
        var service = GetCustomerService(db);
        var userId = "user1";

        //Add 100 customers and then test search
        await service.SeedCustomers(100, userId);

        Search search = new Search()
        {
            Page = 1,
            PageSize = 10,
            SortBy = "Name",
            SortDirection = SortDirection.Ascending,
            FilterText = string.Empty
        };
        var searchResults = await service.SearchCustomersAsync(search, userId);
        Assert.AreEqual(10, searchResults.Results.Count);
    }

}
